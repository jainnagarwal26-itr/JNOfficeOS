-- ====================================================================
-- JN OfficeOS V2.3 Migration 16: Enterprise Connectivity & Performance Indexing
-- Target Database: Supabase PostgreSQL 16+
-- Description: Additive indexes, performance constraints, and RLS policies for full backend connectivity
-- ====================================================================

-- 1. ADDITIVE INDEXING FOR HIGH-THROUGHPUT MULTI-TENANT QUERIES
CREATE INDEX IF NOT EXISTS idx_clients_pan ON jn_clients(pan);
CREATE INDEX IF NOT EXISTS idx_clients_gstin ON jn_clients(gstin);
CREATE INDEX IF NOT EXISTS idx_clients_mobile ON jn_clients(mobile);
CREATE INDEX IF NOT EXISTS idx_client_contacts_client ON jn_client_contacts(client_id);

CREATE INDEX IF NOT EXISTS idx_cases_client ON jn_cases(client_id);
CREATE INDEX IF NOT EXISTS idx_cases_status ON jn_cases(status);
CREATE INDEX IF NOT EXISTS idx_case_tasks_case ON jn_case_tasks(case_id);
CREATE INDEX IF NOT EXISTS idx_case_timeline_case ON jn_case_timeline(case_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON jn_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON jn_invoices(status);
CREATE INDEX IF NOT EXISTS idx_receipts_client ON jn_receipts(client_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON jn_expenses(category);

CREATE INDEX IF NOT EXISTS idx_documents_client ON jn_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_doc ON jn_ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_ai_messages_conv ON jn_ai_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON jn_notifications(recipient_id);

-- 2. ROW LEVEL SECURITY (RLS) POLICIES VERIFICATION
ALTER TABLE jn_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow practice staff full access to jn_clients" ON jn_clients;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_users" ON jn_users;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_cases" ON jn_cases;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_invoices" ON jn_invoices;
DROP POLICY IF EXISTS "Allow practice staff full access to jn_documents" ON jn_documents;

CREATE POLICY "Allow practice staff full access to jn_clients" ON jn_clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_users" ON jn_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_cases" ON jn_cases FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_invoices" ON jn_invoices FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_documents" ON jn_documents FOR ALL USING (true) WITH CHECK (true);

-- 3. STORAGE BUCKET RLS POLICIES FOR ANONYMOUS & PRACTICE STAFF ACCESS
DROP POLICY IF EXISTS "Public and practice staff view document files" ON storage.objects;
DROP POLICY IF EXISTS "Public and practice staff upload document files" ON storage.objects;
DROP POLICY IF EXISTS "Public and practice staff delete document files" ON storage.objects;

CREATE POLICY "Public and practice staff view document files" ON storage.objects FOR SELECT USING (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));
CREATE POLICY "Public and practice staff upload document files" ON storage.objects FOR INSERT WITH CHECK (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));
CREATE POLICY "Public and practice staff delete document files" ON storage.objects FOR DELETE USING (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));
