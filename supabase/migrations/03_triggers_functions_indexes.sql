-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Schema Migration
-- Module: 03_triggers_functions_indexes.sql
-- Description: PostgreSQL Functions, Triggers, Views & Full-Text Search Indexes
-- ==============================================================================

-- 1. ATOMIC NUMBER SEQUENCE GENERATOR FUNCTION
CREATE OR REPLACE FUNCTION generate_next_number_sequence(p_sequence_code TEXT)
RETURNS TEXT AS $$
DECLARE
    v_seq RECORD;
    v_next_val BIGINT;
    v_formatted_id TEXT;
BEGIN
    SELECT * INTO v_seq
    FROM jn_number_sequences
    WHERE sequence_code = p_sequence_code AND is_active = true
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Initialize sequence if not exists
        IF p_sequence_code = 'CLIENT' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('CLIENT', 'CL', 1, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'INVOICE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('INVOICE', 'JNA/2026-27/', 1, 5) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'RECEIPT' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('RECEIPT', 'REC/2026-27/', 1, 5) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'CASE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('CASE', 'CS', 1, 5) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'SERVICE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('SERVICE', 'SRV', 1, 5) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'DOC' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('DOC', 'DOC', 1, 6) RETURNING * INTO v_seq;
        ELSIF p_sequence_code = 'EXPENSE' THEN
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES ('EXPENSE', 'EXP', 1, 5) RETURNING * INTO v_seq;
        ELSE
            INSERT INTO jn_number_sequences (sequence_code, prefix, current_value, padding_length)
            VALUES (p_sequence_code, 'SEQ-', 1, 6) RETURNING * INTO v_seq;
        END IF;
    END IF;

    v_next_val := v_seq.current_value + 1;

    UPDATE jn_number_sequences
    SET current_value = v_next_val,
        updated_at = now()
    WHERE sequence_code = p_sequence_code;

    v_formatted_id := COALESCE(v_seq.prefix, '') || LPAD(v_next_val::TEXT, v_seq.padding_length, '0') || COALESCE(v_seq.suffix, '');

    RETURN v_formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AUTOMATIC UPDATED_AT TIMESTAMP TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    NEW.version_number = OLD.version_number + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_clients_updated_at BEFORE UPDATE ON jn_clients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_invoices_updated_at BEFORE UPDATE ON jn_invoices FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_cases_updated_at BEFORE UPDATE ON jn_cases FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. AUDIT LOGGING TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, old_data, user_email)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', row_to_json(OLD)::jsonb, current_user);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, old_data, new_data, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, current_user);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO jn_audit_logs (table_name, record_id, action, new_data, user_email)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', row_to_json(NEW)::jsonb, current_user);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$ BEGIN
    CREATE TRIGGER trg_audit_clients AFTER INSERT OR UPDATE OR DELETE ON jn_clients FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_audit_invoices AFTER INSERT OR UPDATE OR DELETE ON jn_invoices FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 4. B-TREE & FULL-TEXT SEARCH GIN INDEXES
CREATE INDEX IF NOT EXISTS idx_clients_number ON jn_clients(client_number);
CREATE INDEX IF NOT EXISTS idx_clients_email ON jn_clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON jn_clients(mobile);
CREATE INDEX IF NOT EXISTS idx_clients_pan ON jn_clients(pan);
CREATE INDEX IF NOT EXISTS idx_clients_gstin ON jn_clients(gstin);
CREATE INDEX IF NOT EXISTS idx_clients_status ON jn_clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_search_gin ON jn_clients USING gin (
    to_tsvector('english', COALESCE(client_name, '') || ' ' || COALESCE(trade_name, '') || ' ' || COALESCE(pan, '') || ' ' || COALESCE(gstin, ''))
);

CREATE INDEX IF NOT EXISTS idx_invoices_number ON jn_invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON jn_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON jn_invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_date ON jn_invoices(invoice_date);

CREATE INDEX IF NOT EXISTS idx_cases_number ON jn_cases(case_number);
CREATE INDEX IF NOT EXISTS idx_cases_client_id ON jn_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON jn_cases(status);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON jn_receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_client_id ON jn_receipts(client_id);

-- 5. ANALYTICAL SQL VIEWS (REPLACING SPREADSHEET FORMULAS & VLOOKUPS)
CREATE OR REPLACE VIEW v_client_summaries AS
SELECT 
    c.id AS client_id,
    c.client_number,
    c.client_name,
    c.category,
    c.email,
    c.mobile,
    c.pan,
    c.gstin,
    c.city,
    c.state,
    c.status,
    COALESCE(SUM(inv.total_amount), 0.00) AS total_billed,
    COALESCE(SUM(inv.amount_paid), 0.00) AS total_paid,
    COALESCE(SUM(inv.balance_due), 0.00) AS outstanding_balance,
    COUNT(DISTINCT cs.id) FILTER (WHERE cs.status NOT IN ('FILED_COMPLETED', 'CANCELLED')) AS active_cases,
    COUNT(DISTINCT cnt.id) AS contact_persons_count
FROM jn_clients c
LEFT JOIN jn_invoices inv ON c.id = inv.client_id AND inv.deleted_at IS NULL
LEFT JOIN jn_cases cs ON c.id = cs.client_id AND cs.deleted_at IS NULL
LEFT JOIN jn_client_contacts cnt ON c.id = cnt.client_id AND cnt.deleted_at IS NULL
WHERE c.deleted_at IS NULL AND c.is_active = true
GROUP BY c.id, c.client_number, c.client_name, c.category, c.email, c.mobile, c.pan, c.gstin, c.city, c.state, c.status;

CREATE OR REPLACE VIEW v_dashboard_kpis AS
SELECT
    (SELECT COUNT(*) FROM jn_clients WHERE deleted_at IS NULL AND is_active = true) AS total_active_clients,
    (SELECT COALESCE(SUM(total_amount), 0.00) FROM jn_invoices WHERE deleted_at IS NULL) AS total_billed_revenue,
    (SELECT COALESCE(SUM(amount_paid), 0.00) FROM jn_invoices WHERE deleted_at IS NULL) AS total_collected_revenue,
    (SELECT COALESCE(SUM(balance_due), 0.00) FROM jn_invoices WHERE status = 'UNPAID' AND deleted_at IS NULL) AS total_outstanding,
    (SELECT COUNT(*) FROM jn_cases WHERE status NOT IN ('FILED_COMPLETED', 'CANCELLED') AND deleted_at IS NULL) AS total_active_cases,
    (SELECT COUNT(*) FROM jn_users WHERE is_active = true AND deleted_at IS NULL) AS active_staff_count;
