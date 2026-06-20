# StayOS Microservices Architectural Blueprint
This document outlines the detailed transitional model, domain-driven microservice patterns, strict schema definitions, language recommendations, and zero-downtime database integration plans for **StayOS Channel Manager & CRM**.

---

## 1. High-Level Topology Diagram

```
                    ┌───────────────────────────────┐
                    │       StayOS Client Web       │
                    │   (React SPA + Tailwind CSS)  │
                    └───────────────┬───────────────┘
                                    │ (HTTPS REST/GraphQL)
                                    ▼
                    ┌───────────────────────────────┐
                    │      Traefik / Kong / Nginx   │
                    │         (API Gateway)         │
                    └───────────────┬───────────────┘
                                    │
    ┌──────────────────────┬────────┼──────────────────────┬──────────────────────┐
    │ gRPC                 │ gRPC   │ gRPC                 │ gRPC                 │ gRPC
    ▼                      ▼        ▼                      ▼                      ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Service 1   │ │  Service 2   │ │  Service 3   │ │  Service 4   │ │  Service 5   │
│  IAM & Auth  │ │  Inventory  │ │ Booking Eng. │ │ CRM & Custom │ │ Wallet/Ledg │
└──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
       │                │                │                │                │
 ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐    ┌─────▼─────┐
 │PostgreSQL │    │PostgreSQL │    │PostgreSQL │    │PostgreSQL │    │PostgreSQL │
 │  + Redis  │    │  + Redis  │    │  + Redis  │    │+ Elasticsearch││ (Ledger)  │
 └───────────┘    └───────────┘    └───────────┘    └───────────┘    └───────────┘
       │                │                │                │                │
       └──────────────┬─┴────────────────┴────────────────┴────────────────┘
                      │ (Publish / Subscribe Async Events)
                      ▼
             ┌─────────────────┐
             │  Apache Kafka   │ (Enterprise Message Backbone)
             ├─────────────────┤
             │ - BookingEvents │
             │ - AuditEvents   │
             │ - Notification  │
             └─────────────────┘
```

---

## 2. Microservices Breakdown & Data Language Specifications

To guarantee maximum system decoupling and high performance, we isolate domains into independent runtime units. Each service uses **Protocol Buffers (v3)** and **gRPC** for low-latency internal RPCs, and **JSON REST/GraphQL** for upstream Client interactions.

### Data Languages & Serialization Protocols:
*   **Inter-Service RPC:** Protocol Buffers over gRPC (HTTP/2 multiplexed streams).
*   **Asynchronous Message Format:** Apache Avro (with Confluent Schema Registry) inside Kafka topics to prevent schema drift and enable robust forward/backward compatibility.
*   **External API Gateway Transport:** REST JSON (v1.0 specification compliant) and GraphQL for custom dashboards payload consolidation.

---

## 3. Core Microservices Specifications

### 🔑 Service 1: Identity & Access Management (IAM) Service
Responsible for tenant accounts, role permissions validation, secure session tokens, and cryptographic keys.
*   **Recommended Language:** **Go (Golang)**. Why: Ultra-fast JSON Web Token (JWT) cryptographic signing/payload parsing; low memory footprint under high concurrency; native garbage collector optimization.
*   **Databases:**
    *   **PostgreSQL:** Handles authoritative user records and credentials.
    *   **Redis Cache:** Handles active authorization session lifetimes and active JWT token blocklists/revocations.
*   **API Boundary Ports:** Port `5001` (GraphQL/REST Gateway proxy), Port `6001` (internal gRPC).

#### Auth Schema Data Definition (Drizzle/PostgreSQL dialect):
```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'staff', 'ctv', 'manager');
CREATE TYPE user_status AS ENUM ('PENDING', 'APPROVED', 'ACTIVE', 'INACTIVE');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'ctv',
    status user_status NOT NULL DEFAULT 'PENDING',
    referral_code VARCHAR(50) UNIQUE,
    referred_by VARCHAR(50),
    commission_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_referral ON users(referral_code);
```

---

### 🏢 Service 2: Physical Inventory & Channel Manager
Manages hotels, homestays, villas, physical room layouts, dynamic special rate policies, and real-time synchronization locks.
*   **Recommended Language:** **Go (Golang)**. Why: Synchronization of active rooms requires concurrent task schedulers and background workers. Go's native goroutines make pooling multiple OTAs (KiotViet, Booking.com, Agoda) highly memory-efficient.
*   **Databases:**
    *   **PostgreSQL:** Highly structured relational models tracking Property → RoomType → Room associations.
    *   **Redis:** Dynamic distributed locking on room allocation matrices (`lock:room:{id}:{date}`) to avoid race conditions and double-booking during checkout hot moments.
*   **API Boundary Ports:** Port `5002` (REST Gateway), Port `6002` (gRPC state inquiries).

#### Catalog Schema Data Definition:
```sql
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    description TEXT,
    cover_image VARCHAR(512),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    facilities VARCHAR(255)[] NOT NULL,
    policies TEXT,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    weekend_price DECIMAL(12,2) NOT NULL,
    holiday_price DECIMAL(12,2) NOT NULL,
    max_guests INT NOT NULL DEFAULT 2,
    bed_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE'
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
    room_code VARCHAR(100) UNIQUE NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'AVAILABLE',
    internal_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rooms_property ON rooms(property_id);
```

---

### 🛒 Service 3: Booking Engine & Operations Orchestrator
Handles core reservations, check-in, check-out checklists, invoice calculations, and coordinate dọn dẹp (housekeeping) operations.
*   **Recommended Language:** **Java (Spring Boot / Micronaut) or Go**. Suggestion: **Go** if the dev team prioritizes unified infrastructure tooling; **Java / Spring Boot** if transactional database robustness, strict object-oriented design patterns, and full double-entry ledger bookkeeping are preferred. Here we design with **Go** to guarantee rapid microservices convergence.
*   **Databases:**
    *   **PostgreSQL:** Tracks bookings, pricing snapshots, and audit trails.
*   **API Boundary Ports:** Port `5003` (REST Gateway), Port `6003` (gRPC orchestrator).

#### Booking Engine Schema Data Definition:
```sql
CREATE TYPE booking_source AS ENUM ('DIRECT', 'CTV', 'WEBSITE', 'OTA');
CREATE TYPE booking_status AS ENUM ('PENDING_PAYMENT', 'CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED');

CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL,
    room_id UUID REFERENCES rooms(id) ON DELETE RESTRICT,
    ctv_id UUID NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    nights INT NOT NULL,
    guests INT NOT NULL DEFAULT 1,
    selling_price DECIMAL(12,2) NOT NULL,
    paid_amount DECIMAL(12,2) DEFAULT 0.00,
    booking_status booking_status DEFAULT 'PENDING_PAYMENT',
    payment_status VARCHAR(50) DEFAULT 'UNPAID',
    payment_method VARCHAR(50),
    commission_amount DECIMAL(12,2) DEFAULT 0.00,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_bookings_ctv ON bookings(ctv_id);
```

---

### 👥 Service 4: CRM & CTV Customer Intelligence Service
Aggregates customer profiles, blacklist indicators, tag labels, guest ratings for booking verification, and customer history stats.
*   **Recommended Language:** **Node.js (TypeScript with NestJS)**. Why: Fast, elegant, dynamic schema integration with search engines; perfect matching for customer segmentation, quick email templating, and webhook routing.
*   **Databases:**
    *   **PostgreSQL:** Handles permanent profiles and customer credibility ratings.
    *   **Elasticsearch / MongoDB:** For high-speed full-text indexing, fuzzy search queries, and logs parsing of customer preferences.
*   **API Boundary Ports:** Port `5004` (REST Live-Search Gateway Proxy), Port `6004` (gRPC analytics).

#### CRM Schema Data Definition:
```sql
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(255),
    identity_number VARCHAR(50),
    address TEXT,
    tags VARCHAR(50)[] NOT NULL DEFAULT '{}',
    note TEXT,
    rating INT CHECK (rating BETWEEN 1 AND 5),
    credibility_note TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_full_name_trgm ON customers USING gin(full_name gin_trgm_ops); -- Fuzzy search indexing
```

---

### 🏦 Service 5: Commission Matrix & Financial Ledger Service
Manages CTV wallets, processes real-time payout ledger entries, and accounts for verified commission balances.
*   **Recommended Language:** **Go**. Why: Highest computational precision, excellent security profiles, and concurrency mechanisms for updating wallet counters thread-safely.
*   **Databases:**
    *   **PostgreSQL:** Handles precise money values using `NUMERIC(15,2)` to prevent float calculation precision loss.
*   **API Boundary Ports:** Port `5005` (REST Gateway), Port `6005` (gRPC transaction postings).

#### Ledger Schema Data Definition:
```sql
CREATE TABLE wallets (
    ctv_id UUID PRIMARY KEY,
    balance DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    pending DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    total_earned DECIMAL(15,2) NOT NULL DEFAULT 0.00,
    bank_name VARCHAR(150),
    bank_account VARCHAR(100),
    bank_holder VARCHAR(150),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE commission_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    ctv_id UUID NOT NULL REFERENCES wallets(ctv_id),
    amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ctv_id UUID NOT NULL REFERENCES wallets(ctv_id),
    amount DECIMAL(15,2) NOT NULL,
    bank_name VARCHAR(150) NOT NULL,
    bank_account VARCHAR(100) NOT NULL,
    bank_holder VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE
);
```

---

## 4. Integration & Zero-Downtime Migration Strategy

To evolve the system safely without affecting the live production database/system while operating on Cloud Run containers:

### Phase 1: Deploying the Reverse Proxy / API Gateway (Kong / Traefik)
1. Install an API Gateway in front of your consolidated monolith.
2. Configure HTTP routes to pass through identical paths directly to the legacy server (`/*` gets proxy-forwarded to port `3000`).

### Phase 2: Decouple Modules via Strangler Fig (E.g. CRM / Customer Module)
1. Provision the **CRM Service** in a separate container on port `5004`.
2. Activate a **Change Data Capture (CDC)** tool (like Debezium / Kafka Connect) tracking changes on the legacy `customers` table, replicating rows instantly to the new PostgreSQL schema of Service 4.
3. Once data replicates with zero delay (<30ms), redirect your API Gateway rule for `/api/customers` and `/api/admin/customers` from the Monolith to the new CRM Service container.
4. Legacy database tables remain untouched but can act as temporary backups until full compliance is confirmed.

### Phase 3: Incremental Decoupling of Other Services
1. Move the Commission & Ledger Service next (`/api/wallets` and `/api/payouts` proxies redirect to Port `5005`).
2. Pivot Inventory and Booking Managers.
3. Migrate the Auth module. Once complete, the legacy Monolith is safely retired.

---

## 5. Architectural Quality Guarantees (Auto-Recovery & Scale Guard)

1.  **Strict Transaction Isolation:** Microservices do not participate in cross-service databases queries. Communication occurs via gRPC queries or Kafka topics.
2.  **Circuit Breaking:** Downstream service failures (e.g., mail sending or push notifications) are isolated by Kafka buffers so booking confirmation transactions remain fully unaffected.
3.  **Circuit Breakers (Sentinel / Hystrix rules):** If gRPC calls to the Wallet microservice latency spikes, Booking service gracefully registers booking details locally and queues commission payouts in Kafka to retry once the ledger comes back online.
