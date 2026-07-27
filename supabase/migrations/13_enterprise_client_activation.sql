-- ====================================================================
-- JN OfficeOS V2.1 Migration 13: Enterprise Client Activation & Identity System
-- Additive DDL Schema for Token Hashing, OTP Verification, Devices & Audit Logs
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

-- 1. Client Activation Tokens Table (Stores SHA-256 Hashes Only)
CREATE TABLE IF NOT EXISTS jn_client_activation_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Client Login & Authentication Audit History Table
CREATE TABLE IF NOT EXISTS jn_client_login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    history_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    user_email VARCHAR(255),
    status VARCHAR(32) NOT NULL, -- 'SUCCESS', 'FAILED_PASSWORD', 'ACCOUNT_LOCKED', 'OTP_REQUIRED'
    ip_address VARCHAR(64),
    device_info TEXT,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Client Registered Devices Table
CREATE TABLE IF NOT EXISTS jn_client_registered_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(128) NOT NULL,
    browser VARCHAR(64),
    os VARCHAR(64),
    ip_address VARCHAR(64),
    is_trusted BOOLEAN NOT NULL DEFAULT false,
    last_login_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Client Password Resets Table
CREATE TABLE IF NOT EXISTS jn_client_password_resets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reset_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    reset_token_hash VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Client OTP Verification Requests Table
CREATE TABLE IF NOT EXISTS jn_client_otp_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    otp_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    mobile_number VARCHAR(32) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    purpose VARCHAR(64) NOT NULL DEFAULT 'ACTIVATION', -- 'ACTIVATION', 'LOGIN_DEVICE_OTP', 'PASSWORD_RESET'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_act_tokens_hash ON jn_client_activation_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_act_tokens_client ON jn_client_activation_tokens(client_id);
CREATE INDEX IF NOT EXISTS idx_login_history_client ON jn_client_login_history(client_id);
CREATE INDEX IF NOT EXISTS idx_reg_devices_client ON jn_client_registered_devices(client_id);
CREATE INDEX IF NOT EXISTS idx_pwd_resets_hash ON jn_client_password_resets(reset_token_hash);
CREATE INDEX IF NOT EXISTS idx_otp_reqs_client ON jn_client_otp_requests(client_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE jn_client_activation_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_registered_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_otp_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow practice staff full access to jn_client_activation_tokens" ON jn_client_activation_tokens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_login_history" ON jn_client_login_history FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_registered_devices" ON jn_client_registered_devices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_password_resets" ON jn_client_password_resets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_otp_requests" ON jn_client_otp_requests FOR ALL USING (true) WITH CHECK (true);
