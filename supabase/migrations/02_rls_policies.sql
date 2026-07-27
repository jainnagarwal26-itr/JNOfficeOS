-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Schema Migration
-- Module: 02_rls_policies.sql
-- Description: Row Level Security (RLS) & Granular Access Control Policies
-- ==============================================================================

-- 1. ENABLE ROW LEVEL SECURITY ON ALL TABLES
ALTER TABLE jn_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_number_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_staff_assignments ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_services ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_case_tasks ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_expenses ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_business_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_audit_logs ENABLE ROW LEVEL SECURITY;

ALTER TABLE jn_ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_communication_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_api_webhooks ENABLE ROW LEVEL SECURITY;

-- 2. CREATE HELPER FUNCTION TO GET CURRENT USER ROLE
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role::VARCHAR INTO user_role
    FROM jn_users
    WHERE email = auth.jwt() ->> 'email' OR id::text = auth.uid()::text
    LIMIT 1;

    RETURN COALESCE(user_role, 'STAFF');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. RLS POLICIES FOR USERS & ROLES
CREATE POLICY "Super Admin and Owner full access to users"
ON jn_users FOR ALL
USING (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN') OR
    email = auth.jwt() ->> 'email'
);

-- 4. RLS POLICIES FOR CLIENTS
CREATE POLICY "Owner Admin Manager staff can view active clients"
ON jn_clients FOR SELECT
USING (
    is_active = true AND deleted_at IS NULL AND
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF', 'AUDITOR')
);

CREATE POLICY "Owner Admin Manager staff can insert clients"
ON jn_clients FOR INSERT
WITH CHECK (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF')
);

CREATE POLICY "Owner Admin Manager can update clients"
ON jn_clients FOR UPDATE
USING (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER')
);

-- 5. RLS POLICIES FOR INVOICES & FINANCE
CREATE POLICY "Full finance view for internal staff"
ON jn_invoices FOR SELECT
USING (
    deleted_at IS NULL AND
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF', 'AUDITOR')
);

CREATE POLICY "Owner and Admin manage invoices"
ON jn_invoices FOR ALL
USING (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR')
);

-- 6. RLS POLICIES FOR NOTIFICATIONS & BROADCASTS
CREATE POLICY "Users read their own notifications or public broadcasts"
ON jn_notifications FOR SELECT
USING (
    recipient_user_id IS NULL OR
    recipient_user_id::text = auth.uid()::text OR
    target_audience IN ('All Staff', 'Broadcast to All Staff')
);

CREATE POLICY "Anyone authenticated can read broadcasts"
ON jn_broadcasts FOR SELECT
USING (is_active = true);

CREATE POLICY "Owner and Admin can post broadcasts"
ON jn_broadcasts FOR INSERT
WITH CHECK (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR')
);

-- 7. RLS POLICIES FOR AUDIT LOGS
CREATE POLICY "Auditor Owner Admin can view audit logs"
ON jn_audit_logs FOR SELECT
USING (
    get_current_user_role() IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'AUDITOR')
);
