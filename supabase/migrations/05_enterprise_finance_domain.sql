-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 5: Enterprise Finance, Billing & Accounting DDL
-- Description: 3NF Normalized DDL for Quotations, Invoices, Items, Receipts, Allocations, Expenses, Ledgers, Credit/Debit Notes, GST Views
-- ==============================================================================

-- 1. FINANCE & BILLING DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. QUO/2026-27/000001
    quotation_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE RESTRICT,
    client_name VARCHAR(255) NOT NULL,
    sub_total NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SENT, ACCEPTED, REJECTED, CONVERTED
    notes TEXT,
    terms TEXT,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES jn_quotations(id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS jn_receipt_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_id UUID NOT NULL REFERENCES jn_receipts(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES jn_invoices(id) ON DELETE RESTRICT,
    allocated_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    allocated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_client_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    voucher_type VARCHAR(50) NOT NULL, -- 'INVOICE', 'RECEIPT', 'CREDIT_NOTE', 'DEBIT_NOTE', 'OPENING_BALANCE'
    voucher_number VARCHAR(100) NOT NULL,
    reference_id UUID,
    description TEXT NOT NULL,
    debit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    credit_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    running_balance NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_credit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    credit_note_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. CN/2026-27/000001
    credit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_id UUID REFERENCES jn_invoices(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE RESTRICT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

CREATE TABLE IF NOT EXISTS jn_debit_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    debit_note_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. DN/2026-27/000001
    debit_note_date DATE NOT NULL DEFAULT CURRENT_DATE,
    invoice_id UUID REFERENCES jn_invoices(id) ON DELETE RESTRICT,
    client_id UUID NOT NULL REFERENCES jn_clients(id) ON DELETE RESTRICT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    gst_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    reason TEXT NOT NULL,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id)
);

-- 2. FULL-TEXT SEARCH GIN INDEXES FOR FINANCE DOMAIN
CREATE INDEX IF NOT EXISTS idx_finance_invoices_search ON jn_invoices USING gin (
    to_tsvector('english'::regconfig, 
        COALESCE(invoice_number, '') || ' ' || 
        COALESCE(client_name, '') || ' ' || 
        COALESCE(client_gstin, '')
    )
);

-- 3. ANALYTICAL SQL VIEWS FOR FINANCE DOMAIN
CREATE OR REPLACE VIEW v_invoice_summary AS
SELECT 
    i.id AS invoice_id,
    i.invoice_number,
    i.invoice_date,
    i.due_date,
    i.client_id,
    c.client_number,
    i.client_name,
    i.sub_total,
    i.cgst_amount,
    i.sgst_amount,
    i.igst_amount,
    i.gst_amount,
    i.total_amount,
    i.amount_paid,
    i.balance_due,
    i.status,
    i.created_at
FROM jn_invoices i
JOIN jn_clients c ON i.client_id = c.id
WHERE i.deleted_at IS NULL AND i.is_active = true;

CREATE OR REPLACE VIEW v_outstanding_receivables AS
SELECT 
    c.id AS client_id,
    c.client_number,
    c.client_name,
    c.mobile,
    c.email,
    COUNT(i.id) AS unpaid_invoices_count,
    COALESCE(SUM(i.balance_due), 0.00) AS total_outstanding_amount
FROM jn_clients c
JOIN jn_invoices i ON c.id = i.client_id
WHERE i.status IN ('UNPAID', 'PARTIALLY_PAID', 'OVERDUE') AND i.deleted_at IS NULL
GROUP BY c.id, c.client_number, c.client_name, c.mobile, c.email;

CREATE OR REPLACE VIEW v_gst_summary AS
SELECT 
    TO_CHAR(invoice_date, 'YYYY-MM') AS month_year,
    COUNT(id) AS total_invoices,
    COALESCE(SUM(sub_total), 0.00) AS total_taxable_value,
    COALESCE(SUM(cgst_amount), 0.00) AS total_cgst,
    COALESCE(SUM(sgst_amount), 0.00) AS total_sgst,
    COALESCE(SUM(igst_amount), 0.00) AS total_igst,
    COALESCE(SUM(gst_amount), 0.00) AS total_gst_collected
FROM jn_invoices
WHERE deleted_at IS NULL AND status NOT IN ('CANCELLED', 'DRAFT')
GROUP BY TO_CHAR(invoice_date, 'YYYY-MM')
ORDER BY month_year DESC;

-- 4. RLS POLICIES FOR FINANCE DOMAIN
ALTER TABLE jn_quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_receipt_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_debit_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff view quotations" ON jn_quotations FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage quotations" ON jn_quotations FOR ALL USING (is_admin());

CREATE POLICY "Internal staff view ledgers" ON jn_client_ledgers FOR SELECT USING (is_staff());
CREATE POLICY "Admin manage ledgers" ON jn_client_ledgers FOR ALL USING (is_admin());
