-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Schema Migration
-- Module: 01_enterprise_schema.sql
-- Description: Complete 3NF Normalized PostgreSQL RDBMS DDL for JN OfficeOS
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 2. ENUMS & TYPE DEFINITIONS
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

-- 3. SYSTEM CORE MODULE
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
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name user_role_enum UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES jn_roles(id) ON DELETE CASCADE,
    module_name VARCHAR(100) NOT NULL,
    can_create BOOLEAN NOT NULL DEFAULT false,
    can_read BOOLEAN NOT NULL DEFAULT true,
    can_update BOOLEAN NOT NULL DEFAULT false,
    can_delete BOOLEAN NOT NULL DEFAULT false,
    can_export BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ,
    UNIQUE(role_id, module_name)
);

CREATE TABLE IF NOT EXISTS jn_number_sequences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sequence_code VARCHAR(50) UNIQUE NOT NULL, -- 'CLIENT', 'INVOICE', 'RECEIPT', 'CASE', 'SERVICE', 'DOC'
    prefix VARCHAR(20) NOT NULL,              -- 'CL', 'JNA/2026-27/', 'REC/2026-27/', 'CS', 'SRV', 'DOC'
    current_value BIGINT NOT NULL DEFAULT 0,
    padding_length INTEGER NOT NULL DEFAULT 6,
    suffix VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID,
    updated_by UUID,
    deleted_at TIMESTAMPTZ
);

-- 4. CLIENT MANAGEMENT MODULE
CREATE TABLE IF NOT EXISTS jn_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CL000001
    category client_category_enum NOT NULL DEFAULT 'Individual',
    client_name VARCHAR(255) NOT NULL,
    trade_name VARCHAR(255),
    business_name VARCHAR(255),
    client_source client_source_enum NOT NULL DEFAULT 'Direct',
    referred_by VARCHAR(255),
    pan VARCHAR(20),
    aadhaar VARCHAR(20),
    gstin VARCHAR(25),
    tan VARCHAR(25),
    udyam_registration VARCHAR(50),
    fssai_number VARCHAR(50),
    iec_number VARCHAR(50),
    professional_tax_number VARCHAR(50),
    pf_number VARCHAR(50),
    esic_number VARCHAR(50),
    cin VARCHAR(50),
    din VARCHAR(50),
    msme VARCHAR(50) DEFAULT 'None',
    office_address TEXT,
    city VARCHAR(100),
    state VARCHAR(100) DEFAULT 'Maharashtra',
    pin_code VARCHAR(20),
    country VARCHAR(100) DEFAULT 'India',
    bank_name VARCHAR(150),
    account_holder VARCHAR(255),
    account_number VARCHAR(50),
    ifsc VARCHAR(30),
    branch VARCHAR(100),
    upi VARCHAR(100),
    business_nature VARCHAR(255),
    business_type VARCHAR(100) DEFAULT 'Services',
    constitution VARCHAR(100) DEFAULT 'Individual',
    date_of_incorporation DATE,
    date_of_registration DATE,
    financial_year VARCHAR(20) DEFAULT '2026-27',
    assessment_year VARCHAR(20) DEFAULT '2027-28',
    email VARCHAR(255),
    mobile VARCHAR(30),
    alternate_mobile VARCHAR(30),
    whatsapp VARCHAR(30),
    website VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active',
    tags TEXT[],
    internal_notes TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_client_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    contact_name VARCHAR(255) NOT NULL,
    role VARCHAR(100) DEFAULT 'Contact Person',
    email VARCHAR(255),
    phone VARCHAR(30),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_client_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    role_assigned VARCHAR(100) DEFAULT 'Relationship Manager',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    UNIQUE(client_id, user_id)
);

-- 5. SERVICES CATALOG MODULE
CREATE TABLE IF NOT EXISTS jn_service_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_name VARCHAR(150) UNIQUE NOT NULL,
    description TEXT,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    service_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. SRV00001
    service_name VARCHAR(255) NOT NULL,
    category_id UUID REFERENCES jn_service_categories(id) ON DELETE SET NULL,
    category_name VARCHAR(150) NOT NULL,
    standard_fee NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sac_code VARCHAR(30) DEFAULT '998311',
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    version_number INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

-- 6. CASE & WORKFLOW MANAGEMENT MODULE
CREATE TABLE IF NOT EXISTS jn_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CS00001
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    service_id UUID REFERENCES jn_services(id) ON DELETE SET NULL,
    case_title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    status case_status_enum NOT NULL DEFAULT 'IN_PROGRESS',
    priority priority_enum NOT NULL DEFAULT 'Medium',
    due_date DATE,
    estimated_hours NUMERIC(6,2),
    actual_hours NUMERIC(6,2),
    fee_amount NUMERIC(15,2) DEFAULT 0.00,
    financial_year VARCHAR(20) DEFAULT '2026-27',
    remarks TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_case_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES jn_users(id) ON DELETE CASCADE,
    assignment_role VARCHAR(100) DEFAULT 'Assignee',
    assigned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(case_id, user_id)
);

CREATE TABLE IF NOT EXISTS jn_case_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES jn_cases(id) ON DELETE CASCADE,
    task_title VARCHAR(255) NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT false,
    due_date DATE,
    assigned_to UUID REFERENCES jn_users(id),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. FINANCE & BILLING MODULE
CREATE TABLE IF NOT EXISTS jn_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. JNA/2026-27/00001
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE NOT NULL,
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(255) NOT NULL,
    client_gstin VARCHAR(25),
    client_address TEXT,
    sub_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    cgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    sgst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    igst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    balance_due NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status invoice_status_enum NOT NULL DEFAULT 'UNPAID',
    notes TEXT,
    terms TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES jn_invoices(id) ON DELETE CASCADE,
    service_id UUID REFERENCES jn_services(id) ON DELETE SET NULL,
    service_name VARCHAR(255) NOT NULL,
    sac_code VARCHAR(30) DEFAULT '998311',
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    taxable_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_rate NUMERIC(5,2) NOT NULL DEFAULT 18.00,
    gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00
);

CREATE TABLE IF NOT EXISTS jn_receipts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. REC/2026-27/00001
    receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_id UUID NOT NULL REFERENCES jn_invoices(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE RESTRICT,
    amount_received NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'Bank Transfer',
    transaction_ref VARCHAR(100),
    bank_name VARCHAR(150),
    remarks TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS jn_expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    expense_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. EXP00001
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(150) NOT NULL,
    paid_to VARCHAR(255) NOT NULL,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_mode payment_mode_enum NOT NULL DEFAULT 'Bank Transfer',
    reference_number VARCHAR(100),
    remarks TEXT,
    receipt_url TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

-- 8. DOCUMENT MANAGEMENT SYSTEM (DMS)
CREATE TABLE IF NOT EXISTS jn_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. DOC00001
    client_id UUID REFERENCES jn_clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES jn_cases(id) ON DELETE SET NULL,
    document_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    bucket_id VARCHAR(100) NOT NULL DEFAULT 'jn-documents',
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    expiry_date DATE,
    verification_status VARCHAR(50) DEFAULT 'PENDING',
    tags TEXT[],
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ
);

-- 9. NOTIFICATIONS & EVENTS MODULE
CREATE TABLE IF NOT EXISTS jn_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID REFERENCES jn_users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type notification_type_enum NOT NULL DEFAULT 'System',
    priority priority_enum NOT NULL DEFAULT 'Medium',
    target_audience VARCHAR(100) DEFAULT 'All Staff',
    is_read BOOLEAN NOT NULL DEFAULT false,
    action_url TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_broadcasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    broadcast_type VARCHAR(50) NOT NULL DEFAULT 'Announcement', -- Announcement, Reminder, Information
    target_audience VARCHAR(100) NOT NULL DEFAULT 'Broadcast to All Staff',
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sender_email VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

-- 10. AUTOMATION RULES & AUDIT ENGINE
CREATE TABLE IF NOT EXISTS jn_business_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL,
    trigger_event VARCHAR(100) NOT NULL,
    condition_json JSONB NOT NULL,
    action_json JSONB NOT NULL,
    priority priority_enum NOT NULL DEFAULT 'Medium',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, EXPORT
    old_data JSONB,
    new_data JSONB,
    user_email VARCHAR(255),
    user_id UUID REFERENCES jn_users(id),
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. FUTURE-PROOF EXTENSIBILITY MODULES (AI, OCR, QUEUE, PORTALS, WEBHOOKS)
CREATE TABLE IF NOT EXISTS jn_ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES jn_users(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    context_data JSONB,
    tokens_used INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_ocr_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    extracted_text TEXT,
    confidence_score NUMERIC(5,2),
    raw_ocr_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_communication_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel VARCHAR(30) NOT NULL, -- 'WHATSAPP', 'EMAIL', 'SMS'
    recipient VARCHAR(255) NOT NULL,
    subject VARCHAR(255),
    payload TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, SENT, FAILED
    retry_count INTEGER DEFAULT 0,
    error_message TEXT,
    scheduled_for TIMESTAMPTZ DEFAULT now(),
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    user_email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_api_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    target_url TEXT NOT NULL,
    secret_key VARCHAR(255),
    subscribed_events TEXT[] NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
