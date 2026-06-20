# PostgreSQL Microservice Database Schema Blueprint

This specification documents the production-grade, domain-isolated database schemas for **StayOS’s Microservices Core** utilizing **PostgreSQL**.

---

## 1. Relational SQL vs. NoSQL Architectures (StayOS Justification)

For a high-traffic Channel Manager & CRM handling money and active inventory, data integrity is paramount. We selected **PostgreSQL** over NoSQL (e.g., MongoDB, DynamoDB) due to the following critical principles:

### A. Dual-Entry Ledger Accuracy & ACID Compliance
*   **The Issue:** NoSQL databases adopt an "eventual consistency" model, where document locks across multiple collections are non-atomic.
*   **Relational Advantage:** PostgreSQL guarantees raw **ACID** compliance (Atomicity, Consistency, Isolation, Durability) or standard serializable transaction isolation. This ensures that adjusting a room to `booked` *and* deducting points from the customer’s loyalty tier *and* posting a deposit ledger entry either succeed together or fail with complete rollback. Discrepancies are mathematically impossible.

### B. Prevention of Double-Booking and Race Conditions
*   **The Issue:** In NoSQL, writing to nested elements lacks native foreign-key locks. It can suffer from "phantom read" or "write skew" errors if two OTAs (like Airbnb and Booking.com) book the same room for the same date range simultaneously.
*   **Relational Advantage:** Postgres enables row-locking (`SELECT ... FOR UPDATE`) and transaction serializability. Adding a unique check constraint on `(room_id, date)` makes double-allocating a room physically impossible at the hardware level.

### C. Referral & Commission Referential Integrity
*   **The Issue:** If a collaborator (CTV) profile is updated or deleted in NoSQL, historical referral records become orphaned unless slow, manual application-level sweeps are executed.
*   **Relational Advantage:** Postgres enforces foreign key constraints with structured cascading policies (e.g., `ON DELETE RESTRICT` or `ON DELETE SET NULL`). This guarantees that commissions always point to authorized active wallets.

---

## 2. Shared Data Protocol Definition

To guarantee isolation, **microservices must never share a database**. Each service has private Postgres database clusters. Inter-service state alignment occurs using the **Outbox Pattern** inside PostgreSQL, broadcasting change payloads via Apache Kafka.

```
┌─────────────────────────┐               ┌─────────────────┐               ┌─────────────────────────┐
│  Service A (Write Db)   │               │   Apache Kafka  │               │   Service B (Read Db)   │
│                         │               │                 │               │                         │
│  ┌───────────────────┐  │               │  ┌───────────┐  │               │  ┌───────────────────┐  │
│  │ Transaction:      │  │ Outbox CDC    │  │ Booking   │  │ Async Consumer│  │ Read Optimized    │  │
│  │ 1. Write Bookings ├──┼──────────────►│  │ Event     ├──┼──────────────►│  │ Loyalty Database  │  │
│  │ 2. Write Outbox   │  │ (Debezium)    │  │ Topic     │  │               │  │ Updates           │  │
│  └───────────────────┘  │               │  └───────────┘  │               │  └───────────────────┘  │
└─────────────────────────┘               └─────────────────┘               └─────────────────────────┘
```

---

## 3. SQL Data Definition Languages (DDL)

### 🔑 Module 1: Identity & Access Management (IAM) Service `db_users`
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE tenant_tier AS ENUM ('free', 'pro', 'enterprise');
CREATE TYPE user_status AS ENUM ('pending', 'active', 'suspended');

-- Tenants (Properties Owners / Brand Entities)
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_name VARCHAR(200) NOT NULL,
    tax_code VARCHAR(50) UNIQUE,
    subscription_tier tenant_tier DEFAULT 'free',
    billing_email VARCHAR(255) NOT NULL,
    max_properties INT DEFAULT 5,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Administrative Personnel and CTV Accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL, -- Cryptographically salted bcrypt hash
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ctv', -- 'super_admin', 'admin', 'staff', 'ctv'
    status user_status DEFAULT 'pending',
    referral_code VARCHAR(50) UNIQUE, -- Unique code used by CTVs to share links
    commission_override DECIMAL(5,2) DEFAULT NULL, -- Personal rate overrides if CTV
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_tenant_search ON users(tenant_id, status);
CREATE INDEX idx_users_referral ON users(referral_code) WHERE referral_code IS NOT NULL;
```

### 🏢 Module 2: Catalog & Physical Inventory (PMS) Service `db_inventory`
```sql
-- Hotel/Homestay Complex properties
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL, -- Correlates back to IAM Tenant via API logic
    name VARCHAR(255) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_district VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    facilities VARCHAR(50)[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Categories of Rooms (Classic Deluxe, Luxe Villa, etc.)
CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL, -- Core pricing factor
    weekend_price DECIMAL(12,2) NOT NULL,
    max_guests INT DEFAULT 2,
    bed_configuration VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);

-- Physical rooms / allotments
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
    room_code VARCHAR(50) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'available', -- 'available', 'hold', 'booked', 'cleaning', 'maintenance'
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_per_property UNIQUE(property_id, room_code)
);

CREATE INDEX idx_rooms_lookup ON rooms(property_id, current_status);
```

### 🛎️ Module 3: Booking & Reservation Engine `db_bookings`
```sql
CREATE TYPE booking_stage AS ENUM ('pending_hold', 'confirmed', 'checked_in', 'checked_out', 'cancelled');

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_code VARCHAR(64) UNIQUE NOT NULL, -- Human readable e.g., 'STAY-2026-67910'
    customer_id UUID NOT NULL, -- Bound back to CRM via microservices contract
    room_id UUID NOT NULL, -- Bound back to PMS Room entity via unique UUID
    ctv_id UUID, -- Optional referral associate attribute
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests_count INT NOT NULL DEFAULT 1,
    selling_price DECIMAL(12,2) NOT NULL, -- Pricing fixed at checkin lock time
    calculated_commission DECIMAL(12,2) DEFAULT 0.00,
    booking_status booking_stage DEFAULT 'pending_hold',
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_booking_dates CHECK (check_out > check_in)
);

-- Core calendar double-booking check validation index
CREATE INDEX idx_bookings_duration ON bookings(room_id, check_in, check_out) 
WHERE booking_status != 'cancelled';
```

### 💰 Module 4: Financial Transactions & Payment Service `db_payments`
```sql
CREATE TYPE payment_gateway AS ENUM ('bank_transfer', 'momo', 'vnpay', 'cash');
CREATE TYPE payment_state AS ENUM ('unpaid', 'partially_paid', 'fully_paid', 'refunded');

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL, -- Matches Booking Service Transaction Correlators 
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    subtotal_amount DECIMAL(12,2) NOT NULL,
    tax_amount DECIMAL(12,2) DEFAULT 0.00,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL,
    status payment_state DEFAULT 'unpaid',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    transaction_reference VARCHAR(255) UNIQUE, -- Bank transfer content ID or Momo ID
    gateway payment_gateway NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_successful BOOLEAN DEFAULT FALSE,
    raw_response_log JSONB -- Dynamic audit record parameters
);

CREATE INDEX idx_payments_verification ON payments(is_successful, verified_at);
```

### 💎 Module 5: Customer Loyalty & Rewards program `db_loyalty`
```sql
CREATE TYPE reward_tier AS ENUM ('classic', 'silver', 'gold', 'platinum');

-- Loyalty Accounts matching CRM Contacts
CREATE TABLE loyalty_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID UNIQUE NOT NULL, -- Reference to CRM Customer Profiles
    membership_tier reward_tier DEFAULT 'classic',
    accumulated_points INT DEFAULT 0,
    redeemed_points INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    loyalty_profile_id UUID REFERENCES loyalty_profiles(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL, -- Correlated trigger entity
    points_delta INT NOT NULL, -- +150 (Earned) or -1000 (Redeemed)
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discount points allocation rules
CREATE TABLE redemption_rules (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    points_required INT NOT NULL,
    discount_multiplier DECIMAL(5,4) NOT NULL,
    max_discount_cap DECIMAL(12,2) NOT NULL
);

CREATE INDEX idx_loyalty_profiles ON loyalty_profiles(customer_id, membership_tier);
```

---

## 4. Operational Integrity Rule Checks

1.  **Outbox Synchronization Loop Rate:** Real-time updates emitted by state transactions in Modules 2 & 3 sync with KiotViet XML/JSON APIs with a 50ms batch poll limit on database outbox tables.
2.  **Concurrency Isolation Lock Engine:** When updating room state or verifying deposits, use pessimistic database transaction queries:
    ```sql
    -- Atomic Room Allocation Locking Pattern
    BEGIN;
    SELECT current_status FROM rooms WHERE id = 'target-room-uuid' FOR UPDATE;
    -- Verify status is 'available', then run:
    UPDATE rooms SET current_status = 'booked' WHERE id = 'target-room-uuid';
    COMMIT;
    ```
