-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 2: Enterprise Authentication, RBAC, RLS & Session Security DDL
-- Description: Complete RBAC Tables, Security Definer Functions, RLS Policies, Session Management
-- ==============================================================================

-- 1. AUTHENTICATION & PERMISSIONS DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES jn_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES jn_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    UNIQUE(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS jn_user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES jn_roles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    assigned_by UUID REFERENCES jn_users(id),
    UNIQUE(user_id, role_id)
);

CREATE TABLE IF NOT EXISTS jn_login_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    session_token TEXT UNIQUE NOT NULL,
    device_name VARCHAR(150),
    browser_name VARCHAR(150),
    operating_system VARCHAR(150),
    ip_address VARCHAR(50),
    location_info JSONB,
    is_revoked BOOLEAN NOT NULL DEFAULT false,
    last_activity_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_login_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES jn_users(id) ON DELETE SET NULL,
    user_email VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL, -- 'SUCCESS', 'FAILED', 'BLOCKED', 'LOCKOUT'
    failure_reason TEXT,
    ip_address VARCHAR(50),
    user_agent TEXT,
    device_info JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_password_reset_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    reset_token VARCHAR(255) UNIQUE NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    token_name VARCHAR(150) NOT NULL,
    token_hash VARCHAR(255) UNIQUE NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT ARRAY['read'],
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_security_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL, -- 'RLS_VIOLATION', 'FAILED_LOGIN', 'PASSWORD_RESET', 'ROLE_CHANGE', 'SESSION_REVOKED'
    severity priority_enum NOT NULL DEFAULT 'High',
    user_id UUID REFERENCES jn_users(id) ON DELETE SET NULL,
    user_email VARCHAR(255),
    ip_address VARCHAR(50),
    event_details JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_failed_login_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_email VARCHAR(255) UNIQUE NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 1,
    last_failed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    is_locked_out BOOLEAN NOT NULL DEFAULT false,
    locked_until TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_device_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(150),
    is_trusted BOOLEAN NOT NULL DEFAULT false,
    registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, device_fingerprint)
);

CREATE TABLE IF NOT EXISTS jn_user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    theme VARCHAR(50) DEFAULT 'light',
    language VARCHAR(20) DEFAULT 'en',
    email_notifications BOOLEAN DEFAULT true,
    whatsapp_notifications BOOLEAN DEFAULT true,
    preferences_json JSONB DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. SECURITY DEFINER HELPER FUNCTIONS FOR AUTHORIZATION

CREATE OR REPLACE FUNCTION get_current_user_email()
RETURNS VARCHAR AS $$
BEGIN
    RETURN COALESCE(auth.jwt() ->> 'email', current_user);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    v_role VARCHAR;
BEGIN
    SELECT role::VARCHAR INTO v_role
    FROM jn_users
    WHERE email = get_current_user_email() OR id::text = auth.uid()::text
    LIMIT 1;

    RETURN COALESCE(v_role, 'STAFF');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_permission(p_permission_code TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_role VARCHAR;
    v_has_perm BOOLEAN := false;
BEGIN
    v_role := get_current_user_role();

    IF v_role IN ('OWNER', 'SUPER_ADMIN') THEN
        RETURN true;
    END IF;

    SELECT EXISTS (
        SELECT 1
        FROM jn_permissions p
        JOIN jn_roles r ON p.role_id = r.id
        WHERE r.role_name::VARCHAR = v_role
          AND p.permission_code = p_permission_code
          AND p.can_read = true
          AND p.is_active = true
    ) INTO v_has_perm;

    RETURN v_has_perm;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_owner() RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_role() = 'OWNER'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_manager() RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_staff() RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF'); END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_client() RETURNS BOOLEAN AS $$
BEGIN RETURN get_current_user_role() = 'CLIENT_PORTAL'; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FAILED LOGIN PROTECTION & LOCKOUT PROCEDURE
CREATE OR REPLACE FUNCTION record_failed_login(p_email VARCHAR, p_ip VARCHAR, p_reason TEXT)
RETURNS VOID AS $$
DECLARE
    v_attempts INTEGER;
BEGIN
    INSERT INTO jn_failed_login_attempts (user_email, attempt_count, last_failed_at)
    VALUES (p_email, 1, now())
    ON CONFLICT (user_email) DO UPDATE SET
        attempt_count = jn_failed_login_attempts.attempt_count + 1,
        last_failed_at = now(),
        is_locked_out = CASE WHEN jn_failed_login_attempts.attempt_count + 1 >= 5 THEN true ELSE false END,
        locked_until = CASE WHEN jn_failed_login_attempts.attempt_count + 1 >= 5 THEN now() + INTERVAL '15 minutes' ELSE NULL END;

    INSERT INTO jn_login_history (user_email, status, failure_reason, ip_address)
    VALUES (p_email, 'FAILED', p_reason, p_ip);

    IF v_attempts >= 5 THEN
        INSERT INTO jn_security_events (event_type, severity, user_email, ip_address, event_details)
        VALUES ('SUSPICIOUS_LOGIN', 'Critical', p_email, p_ip, jsonb_build_object('reason', '5 consecutive failed logins - account locked 15m'));
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. ENABLE RLS ON AUTHENTICATION & SECURITY TABLES
ALTER TABLE jn_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_login_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_security_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_user_preferences ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR SECURITY DOMAIN
CREATE POLICY "Admins full access to roles" ON jn_roles FOR ALL USING (is_admin());

CREATE POLICY "Admins full access to permissions" ON jn_permissions FOR ALL USING (is_admin());

CREATE POLICY "Users read own preferences" ON jn_user_preferences FOR SELECT USING (
    user_id::text = auth.uid()::text OR is_admin()
);

CREATE POLICY "Users update own preferences" ON jn_user_preferences FOR UPDATE USING (
    user_id::text = auth.uid()::text OR is_admin()
);

CREATE POLICY "Admins view security events" ON jn_security_events FOR SELECT USING (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'AUDITOR')
);
