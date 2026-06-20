-- ============================================================================
-- STAYOS POSTGRESQL MICROSERVICES MASTER SCHEMA SCRIPT
-- ============================================================================
-- This script contains authoritative DDL definitions for the isolated db clusters
-- powering the StayOS microservices ecosystem. It defines the schemas for:
-- 1. Identity & Access Management (db_users)
-- 2. Physical Inventory & PMS (db_inventory)
-- 3. Core Booking & Reservations (db_bookings)
-- 4. Financial Ledgers & Payments (db_payments)
-- 5. Customer Loyalty & Rewards (db_loyalty)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. IAM SERVICE DATABASE (db_users)
-- ----------------------------------------------------------------------------
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone_number VARCHAR(30) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'ctv', -- super_admin, admin, staff, ctv
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, active, suspended
    referral_code VARCHAR(50) UNIQUE,
    commission_override DECIMAL(5,2) DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_lookup ON users (status, role);
CREATE INDEX idx_users_referral_code ON users (referral_code) WHERE referral_code IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. PMS/INVENTORY SERVICE DATABASE (db_inventory)
-- ----------------------------------------------------------------------------
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    location_city VARCHAR(100) NOT NULL,
    location_district VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    cover_image VARCHAR(512),
    facilities VARCHAR(50)[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE room_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    weekend_price DECIMAL(12,2) NOT NULL,
    max_guests INT DEFAULT 2,
    bed_configuration VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
    room_type_id UUID REFERENCES room_types(id) ON DELETE SET NULL,
    room_code VARCHAR(50) NOT NULL,
    room_name VARCHAR(100) NOT NULL,
    current_status VARCHAR(50) DEFAULT 'available', -- available, hold, booked, cleaning, maintenance
    internal_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_room_per_property_code UNIQUE(property_id, room_code)
);

CREATE INDEX idx_rooms_property_lookup ON rooms(property_id, current_status);

-- ----------------------------------------------------------------------------
-- 3. BOOKING SERVICE DATABASE (db_bookings)
-- ----------------------------------------------------------------------------
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code VARCHAR(64) UNIQUE NOT NULL, -- e.g., 'STAY-YEAR-CODE'
    customer_id UUID NOT NULL, -- Matched to external CRM service profile
    room_id UUID NOT NULL, -- PMS room lock reference
    ctv_id UUID, -- Optional referrer associate
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    guests_count INT NOT NULL DEFAULT 1,
    selling_price DECIMAL(12,2) NOT NULL,
    calculated_commission DECIMAL(12,2) DEFAULT 0.00,
    booking_status VARCHAR(50) DEFAULT 'pending_hold', -- pending_hold, confirmed, checked_in, checked_out, cancelled
    special_requests TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_check_dates CHECK (check_out > check_in)
);

CREATE INDEX idx_bookings_date_range ON bookings(room_id, check_in, check_out)
WHERE booking_status != 'cancelled';

-- ----------------------------------------------------------------------------
-- 4. FINANCIAL PAYMENTS SERVICE DATABASE (db_payments)
-- ----------------------------------------------------------------------------
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'unpaid', -- unpaid, partially_paid, fully_paid, refunded
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    transaction_reference VARCHAR(255) UNIQUE,
    gateway VARCHAR(100) NOT NULL, -- bank_transfer, momo, vnpay, cash
    amount DECIMAL(12,2) NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    is_successful BOOLEAN DEFAULT FALSE,
    raw_payload_logs JSONB
);

CREATE INDEX idx_payments_verification_logs ON payments(is_successful, verified_at);

-- ----------------------------------------------------------------------------
-- 5. LOYALTY DATABASE (db_loyalty)
-- ----------------------------------------------------------------------------
CREATE TABLE loyalty_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID UNIQUE NOT NULL,
    membership_tier VARCHAR(50) DEFAULT 'classic', -- classic, silver, gold, platinum
    accumulated_points INT DEFAULT 0,
    redeemed_points INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE loyalty_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loyalty_profile_id UUID REFERENCES loyalty_profiles(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL,
    points_delta INT NOT NULL, -- +150 for booking, -1000 for redemption
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_loyalty_mapping ON loyalty_profiles (customer_id, membership_tier);
