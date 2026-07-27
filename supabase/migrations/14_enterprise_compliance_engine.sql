-- ====================================================================
-- JN OfficeOS V2.2 Migration 14: Enterprise Compliance Engine (Storage-Optimized)
-- Additive DDL Schema for Storage-Independent Statutory Compliance Management
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

-- 1. Master Statutory Compliance Catalog Table
CREATE TABLE IF NOT EXISTS jn_compliance_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL, -- 'DIRECT_TAX', 'INDIRECT_TAX', 'CORPORATE_LAW', 'LABOUR_LAW', 'LICENSING', 'OTHER'
    frequency VARCHAR(32) NOT NULL, -- 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME'
    authority VARCHAR(128) NOT NULL, -- 'Income Tax Dept', 'GSTN', 'MCA', 'PF/ESI Corp', 'State Govt', etc.
    default_due_day INT, -- e.g. 7, 11, 20, 31
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 2. Client Applicable Compliance Configuration Table
CREATE TABLE IF NOT EXISTS jn_client_compliances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    compliance_code VARCHAR(64) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    assigned_staff_id VARCHAR(64),
    custom_remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(client_id, compliance_code)
);

-- 3. Central Structured Compliance Filing Register Table (Zero File Dependency)
CREATE TABLE IF NOT EXISTS jn_compliance_register (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    record_id VARCHAR(64) UNIQUE NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    compliance_code VARCHAR(64) NOT NULL,
    compliance_name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    fy VARCHAR(32) NOT NULL, -- e.g. '2026-27'
    ay VARCHAR(32) NOT NULL, -- e.g. '2027-28'
    period VARCHAR(64) NOT NULL, -- e.g. 'April 2026', 'Q1 (Apr-Jun)', 'Annual'
    due_date DATE NOT NULL,
    filed_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'NOT_STARTED', -- 'NOT_STARTED', 'IN_PROGRESS', 'WAITING_CLIENT', 'UNDER_REVIEW', 'FILED', 'VERIFIED', 'COMPLETED', 'REOPENED', 'OVERDUE', 'CANCELLED'
    ack_number VARCHAR(128),
    assigned_staff_id VARCHAR(64),
    assigned_staff_name VARCHAR(255),
    reviewed_by VARCHAR(255),
    approved_by VARCHAR(255),
    remarks TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Compliance Activity Timeline Table
CREATE TABLE IF NOT EXISTS jn_compliance_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id VARCHAR(64) UNIQUE NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    performed_by VARCHAR(255) NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Compliance Audit Trail Table
CREATE TABLE IF NOT EXISTS jn_compliance_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_id VARCHAR(64) UNIQUE NOT NULL,
    record_id VARCHAR(64) NOT NULL,
    client_id VARCHAR(64) NOT NULL,
    field_name VARCHAR(64) NOT NULL,
    old_value TEXT,
    new_value TEXT,
    changed_by VARCHAR(255) NOT NULL,
    user_role VARCHAR(64),
    ip_address VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- SEED DEFAULT COMPLIANCE MASTER CATALOG (Income Tax, GST, & TDS)
-- ====================================================================

INSERT INTO jn_compliance_master (code, name, category, frequency, authority, default_due_day, description) VALUES
('ITR_INDIVIDUAL', 'Income Tax Return (Individual/HUF)', 'DIRECT_TAX', 'YEARLY', 'Income Tax Department', 31, 'Annual Income Tax Return filing for non-audit individuals & HUF'),
('ITR_CORPORATE', 'Income Tax Return (Company/Audit Cases)', 'DIRECT_TAX', 'YEARLY', 'Income Tax Department', 31, 'Annual Income Tax Return filing for Corporate & Tax Audit entities'),
('TAX_AUDIT', 'Tax Audit Report (Form 3CA/3CB-3CD)', 'DIRECT_TAX', 'YEARLY', 'Income Tax Department', 30, 'Tax Audit Report filing under Section 44AB'),
('TDS_QUARTERLY', 'TDS Quarterly Return (Form 24Q/26Q/27Q)', 'DIRECT_TAX', 'QUARTERLY', 'Income Tax Department', 31, 'Quarterly TDS return filing & certificate generation'),
('GSTR_1', 'GST Return GSTR-1 (Outward Supplies)', 'INDIRECT_TAX', 'MONTHLY', 'GSTN Portal', 11, 'Monthly outward supplies return for GST taxpayers'),
('GSTR_3B', 'GST Return GSTR-3B (Summary & Tax Payment)', 'INDIRECT_TAX', 'MONTHLY', 'GSTN Portal', 20, 'Monthly summary return & self-assessed tax payment'),
('CMP_08', 'GST Composition Statement (CMP-08)', 'INDIRECT_TAX', 'QUARTERLY', 'GSTN Portal', 18, 'Quarterly statement-cum-challan for Composition dealers'),
('GSTR_9', 'GST Annual Return (GSTR-9 & 9C)', 'INDIRECT_TAX', 'YEARLY', 'GSTN Portal', 31, 'Annual GST return & reconciliation statement')
ON CONFLICT (code) DO NOTHING;

-- ====================================================================
-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_comp_reg_client ON jn_compliance_register(client_id);
CREATE INDEX IF NOT EXISTS idx_comp_reg_status ON jn_compliance_register(status);
CREATE INDEX IF NOT EXISTS idx_comp_reg_duedate ON jn_compliance_register(due_date);
CREATE INDEX IF NOT EXISTS idx_comp_reg_code ON jn_compliance_register(compliance_code);
CREATE INDEX IF NOT EXISTS idx_comp_reg_fy ON jn_compliance_register(fy);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE jn_compliance_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_compliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_compliance_register ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_compliance_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_compliance_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow practice staff full access to jn_compliance_master" ON jn_compliance_master;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_client_compliances" ON jn_client_compliances;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_compliance_register" ON jn_compliance_register;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_compliance_activity" ON jn_compliance_activity;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_compliance_audit" ON jn_compliance_audit;

CREATE POLICY "Allow practice staff full access to jn_compliance_master" ON jn_compliance_master FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_client_compliances" ON jn_client_compliances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_compliance_register" ON jn_compliance_register FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_compliance_activity" ON jn_compliance_activity FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_compliance_audit" ON jn_compliance_audit FOR ALL USING (true) WITH CHECK (true);
