-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 1: Database Foundation & Core Infrastructure
-- Description: Base 3NF Normalized DDL, Sequences, Triggers, Audit Engine
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUM DEFINITIONS
DO $$ BEGIN
    CREATE TYPE user_role_enum AS ENUM ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF', 'AUDITOR', 'CLIENT_PORTAL', 'VENDOR_PORTAL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE client_category_enum AS ENUM ('Individual', 'Proprietorship', 'Partnership', 'LLP', 'Private Limited', 'Public Limited', 'Trust', 'Society', 'NGO', 'HUF');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE client_source_enum AS ENUM ('Direct', 'Indirect / Referral', 'Website', 'Walk-in', 'Campaign');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE invoice_status_enum AS ENUM ('DRAFT', 'UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_mode_enum AS ENUM ('Bank Transfer', 'UPI', 'Cheque', 'Cash', 'Credit Card', 'Net Banking');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE case_status_enum AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'PENDING_CLIENT_DOCS', 'UNDER_REVIEW', 'FILED_COMPLETED', 'ON_HOLD', 'CANCELLED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE priority_enum AS ENUM ('Low', 'Medium', 'High', 'Critical', 'Urgent');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type_enum AS ENUM ('Announcement', 'Reminder', 'Information', 'Alert', 'System', 'Compliance', 'Workflow');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. SYSTEM CORE TABLES

CREATE TABLE IF NOT EXISTS jn_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_number VARCHAR(30) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role user_role_enum NOT NULL DEFAULT 'STAFF',
    phone VARCHAR(30),
    avatar_url TEXT,
    department VARCHAR(100),
    designation VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID
);

CREATE TABLE IF NOT EXISTS jn_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name user_role_enum UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES jn_roles(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    permission_code VARCHAR(100) NOT NULL, -- e.g. 'INVOICE_CREATE', 'CLIENT_DELETE'
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id),
    UNIQUE(role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS jn_number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_code VARCHAR(50) UNIQUE NOT NULL, -- 'CLIENT', 'INVOICE', 'RECEIPT', 'CASE', 'SERVICE', 'DOC', 'EXPENSE'
    prefix VARCHAR(30) NOT NULL,              -- 'CL', 'JNA/2026-27/', 'REC', 'CAS', 'SRV', 'DOC', 'EXP'
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_length INTEGER NOT NULL DEFAULT 6,
    suffix VARCHAR(30),
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_lookup_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lookup_category VARCHAR(100) NOT NULL, -- 'DEPARTMENT', 'DESIGNATION', 'STATE', 'BUSINESS_NATURE'
    lookup_code VARCHAR(100) NOT NULL,
    lookup_label VARCHAR(255) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id),
    UNIQUE(lookup_category, lookup_code)
);

CREATE TABLE IF NOT EXISTS jn_system_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'HEALTHY',
    latency_ms INTEGER DEFAULT 0,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(30) NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'FILE_DOWNLOAD', 'FILE_UPLOAD', 'STATUS_CHANGE', 'ROLE_CHANGE'
    old_values JSONB,
    new_values JSONB,
    user_email VARCHAR(255),
    user_id UUID REFERENCES jn_users(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE jn_audit_logs ADD COLUMN IF NOT EXISTS old_values JSONB;
ALTER TABLE jn_audit_logs ADD COLUMN IF NOT EXISTS new_values JSONB;
ALTER TABLE jn_audit_logs ADD COLUMN IF NOT EXISTS old_data JSONB;
ALTER TABLE jn_audit_logs ADD COLUMN IF NOT EXISTS new_data JSONB;

-- 4. ATOMIC BUSINESS NUMBER SEQUENCE GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION generate_next_business_number(p_sequence_code TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq RECORD;
    v_next_val BIGINT;
    v_formatted_number TEXT;
BEGIN
    SELECT * INTO v_seq
    FROM jn_number_sequences
    WHERE sequence_code = p_sequence_code AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        IF p_sequence_code = 'CLIENT' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('CLIENT', 'CL', 0, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'INVOICE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('INVOICE', 'JNA/2026-27/', 0, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'RECEIPT' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('RECEIPT', 'REC', 0, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'CASE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('CASE', 'CAS', 0, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'SERVICE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('SERVICE', 'SRV', 0, 5) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'DOC' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('DOC', 'DOC', 0, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'EXPENSE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('EXPENSE', 'EXP', 0, 5) RETURNING * INTO v_seq;
        ELSE
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES (p_sequence_code, 'SEQ-', 0, 6) RETURNING * INTO v_seq;
        END IF;
    END IF;

    v_next_val := v_seq.current_value + 1;

    UPDATE jn_number_sequences
    SET current_value = v_next_val,
        updated_at = now()
    WHERE sequence_code = p_sequence_code;

    v_formatted_number := COALESCE(v_seq.prefix, '') || LPAD(v_next_val::TEXT, v_seq.padding_length, '0') || COALESCE(v_seq.suffix, '');

    RETURN v_formatted_number;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. AUTOMATIC TIMESTAMP & CONCURRENCY TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trg_update_timestamp_and_version()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.version_number = OLD.version_number + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON jn_users FOR EACH ROW EXECUTE FUNCTION trg_update_timestamp_and_version();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON jn_roles FOR EACH ROW EXECUTE FUNCTION trg_update_timestamp_and_version();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_settings_updated_at BEFORE UPDATE ON jn_settings FOR EACH ROW EXECUTE FUNCTION trg_update_timestamp_and_version();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 6. AUDIT TRAIL LOGGING TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION trg_audit_logger()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, old_values, user_email)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, current_user);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, old_values, new_values, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, new_values, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, current_user);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
    CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON jn_users FOR EACH ROW EXECUTE FUNCTION trg_audit_logger();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 7. INITIALIZE DEFAULT NUMBER SEQUENCES
SELECT generate_next_business_number('CLIENT');
SELECT generate_next_business_number('INVOICE');
SELECT generate_next_business_number('RECEIPT');
SELECT generate_next_business_number('CASE');
SELECT generate_next_business_number('SERVICE');
SELECT generate_next_business_number('DOC');
SELECT generate_next_business_number('EXPENSE');
