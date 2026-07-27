-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 3: Enterprise CRM Domain DDL
-- Description: 3NF Normalized DDL for Clients, Contacts, Addresses, Communications, Followups, Full-Text Search
-- ==============================================================================

-- 1. CRM DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_client_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    address_type VARCHAR(50) NOT NULL DEFAULT 'Registered Office', -- Registered Office, Head Office, Branch Office, Factory, Correspondence Address
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(100) NOT NULL DEFAULT 'Maharashtra',
    pin_code VARCHAR(20) NOT NULL,
    country VARCHAR(100) NOT NULL DEFAULT 'India',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_client_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    bank_name VARCHAR(150) NOT NULL,
    account_holder VARCHAR(255) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    ifsc_code VARCHAR(30) NOT NULL,
    branch_name VARCHAR(100),
    account_type VARCHAR(50) DEFAULT 'Current Account',
    upi_id VARCHAR(100),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_client_tax_information (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    pan VARCHAR(20),
    gstin VARCHAR(25),
    tan VARCHAR(25),
    cin VARCHAR(50),
    llpin VARCHAR(50),
    msme_registration VARCHAR(50),
    udyam_registration VARCHAR(50),
    gst_filing_frequency VARCHAR(30) DEFAULT 'Monthly', -- Monthly, Quarterly (QRMP)
    tax_assessment_circle VARCHAR(100),
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id),
    UNIQUE(client_id)
);

CREATE TABLE IF NOT EXISTS jn_client_communication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    communication_type VARCHAR(50) NOT NULL, -- 'Phone Call', 'Email', 'WhatsApp', 'Meeting', 'Site Visit'
    subject VARCHAR(255) NOT NULL,
    summary TEXT NOT NULL,
    outcome VARCHAR(100),
    communicated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    performed_by UUID REFERENCES jn_users(id),
    attachment_urls TEXT[],
    status VARCHAR(50) DEFAULT 'COMPLETED',
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_client_followups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    followup_type VARCHAR(50) NOT NULL, -- 'Call Reminder', 'Meeting Reminder', 'Compliance Reminder', 'Renewal Reminder', 'Birthday Reminder'
    title VARCHAR(255) NOT NULL,
    notes TEXT,
    due_date TIMESTAMPTZ NOT NULL,
    assigned_to UUID REFERENCES jn_users(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE'
    completed_at TIMESTAMPTZ,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_client_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    note_title VARCHAR(255),
    note_content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

-- 2. FULL-TEXT SEARCH GIN INDEXES FOR CRM DOMAIN
CREATE INDEX IF NOT EXISTS idx_crm_clients_search ON jn_clients USING gin (
    to_tsvector('english'::regconfig, 
        COALESCE(client_name, '') || ' ' || 
        COALESCE(trade_name, '') || ' ' || 
        COALESCE(pan, '') || ' ' || 
        COALESCE(gstin, '') || ' ' || 
        COALESCE(mobile, '') || ' ' || 
        COALESCE(email, '') || ' ' || 
        COALESCE(client_number, '')
    )
);

-- 3. ANALYTICAL VIEWS FOR CRM DOMAIN
CREATE OR REPLACE VIEW v_client_summary AS
SELECT 
    c.id AS client_id,
    c.client_number,
    c.client_name,
    c.trade_name,
    c.category,
    c.client_source,
    c.pan,
    c.gstin,
    c.email,
    c.mobile,
    c.city,
    c.state,
    c.status,
    c.created_at,
    COUNT(DISTINCT cnt.id) AS total_contacts,
    COUNT(DISTINCT comm.id) AS total_communications,
    COUNT(DISTINCT f.id) FILTER (WHERE f.status = 'PENDING') AS pending_followups
FROM jn_clients c
LEFT JOIN jn_client_contacts cnt ON c.id = cnt.client_id AND cnt.deleted_at IS NULL
LEFT JOIN jn_client_communication comm ON c.id = comm.client_id AND comm.deleted_at IS NULL
LEFT JOIN jn_client_followups f ON c.id = f.client_id AND f.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.is_active = true
GROUP BY c.id, c.client_number, c.client_name, c.trade_name, c.category, c.client_source, c.pan, c.gstin, c.email, c.mobile, c.city, c.state, c.status, c.created_at;

-- 4. RLS POLICIES FOR CRM DOMAIN
ALTER TABLE jn_client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_tax_information ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_communication ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_followups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff view CRM addresses" ON jn_client_addresses FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff manage CRM addresses" ON jn_client_addresses FOR ALL USING (is_staff());

CREATE POLICY "Internal staff view CRM communications" ON jn_client_communication FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff manage CRM communications" ON jn_client_communication FOR ALL USING (is_staff());

CREATE POLICY "Internal staff view CRM followups" ON jn_client_followups FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff manage CRM followups" ON jn_client_followups FOR ALL USING (is_staff());
