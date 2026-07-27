-- ====================================================================
-- JN OfficeOS V2.1 Migration 12: Enterprise Client Self-Service Portal
-- Additive DDL Schema for Client Authentication, Sessions, Requests, & Appointments
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

-- 1. Client Portal Users Table
CREATE TABLE IF NOT EXISTS jn_client_portal_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id VARCHAR(64) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'PENDING'
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Client Multi-Device Sessions Table
CREATE TABLE IF NOT EXISTS jn_client_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id VARCHAR(64) UNIQUE NOT NULL,
    portal_user_id UUID REFERENCES jn_client_portal_users(id) ON DELETE CASCADE,
    client_id VARCHAR(64) NOT NULL,
    device_info TEXT,
    ip_address VARCHAR(64),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. Client Service Requests & Tickets Table
CREATE TABLE IF NOT EXISTS jn_client_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    request_type VARCHAR(64) NOT NULL, -- 'ITR_FILING', 'GST_COMPLIANCE', 'LOAN_DOCUMENTS', 'COMPLIANCE_QUERY', 'OTHER'
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    priority VARCHAR(32) NOT NULL DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'URGENT'
    status VARCHAR(32) NOT NULL DEFAULT 'OPEN', -- 'OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'
    assigned_staff_id VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Client Appointments Scheduling Table
CREATE TABLE IF NOT EXISTS jn_client_appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    duration_mins INT NOT NULL DEFAULT 30,
    status VARCHAR(32) NOT NULL DEFAULT 'SCHEDULED', -- 'SCHEDULED', 'COMPLETED', 'CANCELLED', 'RESCHEDULED'
    meeting_link TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Secure Client-Firm Messaging Table
CREATE TABLE IF NOT EXISTS jn_client_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    sender_type VARCHAR(32) NOT NULL, -- 'CLIENT', 'STAFF', 'SYSTEM'
    sender_name VARCHAR(255) NOT NULL,
    message_text TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Client Activity & Audit Logs Table
CREATE TABLE IF NOT EXISTS jn_client_activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    log_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    ip_address VARCHAR(64),
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_portal_users_client ON jn_client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_sessions_user ON jn_client_sessions(portal_user_id);
CREATE INDEX IF NOT EXISTS idx_client_requests_client ON jn_client_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_client_appointments_client ON jn_client_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_client ON jn_client_messages(client_id);
CREATE INDEX IF NOT EXISTS idx_client_activity_client ON jn_client_activity_logs(client_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE jn_client_portal_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_activity_logs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS for practice staff & client portal users
CREATE POLICY "Allow practice staff full access to jn_client_portal_users" ON jn_client_portal_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_sessions" ON jn_client_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_requests" ON jn_client_requests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_appointments" ON jn_client_appointments FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_messages" ON jn_client_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_activity_logs" ON jn_client_activity_logs FOR ALL USING (true) WITH CHECK (true);
