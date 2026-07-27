-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Migration
-- MODULE 6: Enterprise Document Management System (DMS) DDL
-- Description: 3NF Normalized DDL for Documents, Storage Metadata, Versions, Verifications, Signed Shares, OCR Hooks, Views
-- ==============================================================================

-- 1. DMS DOMAIN TABLES

CREATE TABLE IF NOT EXISTS jn_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. DOC000001
    client_id UUID REFERENCES jn_clients(id) ON DELETE CASCADE,
    case_id UUID REFERENCES jn_cases(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL, -- 'PAN', 'Aadhaar', 'GST Certificate', 'ITR Acknowledgement', 'Balance Sheet', 'Invoices', etc.
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    bucket_id VARCHAR(100) NOT NULL DEFAULT 'jn-documents',
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    checksum_sha256 VARCHAR(64),
    status VARCHAR(50) NOT NULL DEFAULT 'UPLOADED', -- 'DRAFT', 'UPLOADED', 'VERIFIED', 'REJECTED', 'EXPIRED', 'ARCHIVED'
    issue_date DATE,
    expiry_date DATE,
    version_number INTEGER NOT NULL DEFAULT 1,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by UUID REFERENCES jn_users(id),
    updated_by UUID REFERENCES jn_users(id),
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES jn_users(id)
);

ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS document_number VARCHAR(50);
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100) DEFAULT 'application/pdf';
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64);
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'UPLOADED';
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS issue_date DATE;
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS expiry_date DATE;

CREATE TABLE IF NOT EXISTS jn_document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES jn_documents(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    file_path TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    version_remarks TEXT,
    uploaded_by UUID REFERENCES jn_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_document_verification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES jn_documents(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL REFERENCES jn_users(id),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'VERIFIED', -- 'VERIFIED', 'REJECTED', 'REVERIFICATION_REQUESTED'
    remarks TEXT,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_document_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES jn_documents(id) ON DELETE CASCADE,
    share_token VARCHAR(100) UNIQUE NOT NULL,
    signed_url TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    max_downloads INTEGER DEFAULT 5,
    download_count INTEGER NOT NULL DEFAULT 0,
    shared_by UUID REFERENCES jn_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jn_ocr_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES jn_documents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
    extracted_text TEXT,
    confidence_score NUMERIC(5,2),
    processing_time_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. FULL-TEXT SEARCH GIN INDEXES FOR DMS DOMAIN
ALTER TABLE jn_documents ADD COLUMN IF NOT EXISTS original_filename VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_dms_search_gin ON jn_documents USING gin (
    to_tsvector('english'::regconfig, 
        COALESCE(document_number, '') || ' ' || 
        COALESCE(document_name, '') || ' ' || 
        COALESCE(category, '') || ' ' || 
        COALESCE(original_filename, '')
    )
);

-- 3. ANALYTICAL SQL VIEWS FOR DMS DOMAIN
CREATE OR REPLACE VIEW v_document_summary AS
SELECT 
    d.id AS document_id,
    d.document_number,
    d.category,
    d.document_name,
    d.original_filename,
    d.mime_type,
    d.file_size_bytes,
    d.status,
    d.version_number,
    d.client_id,
    c.client_number,
    c.client_name,
    d.case_id,
    d.created_at
FROM jn_documents d
LEFT JOIN jn_clients c ON d.client_id = c.id
WHERE d.deleted_at IS NULL AND d.is_active = true;

CREATE OR REPLACE VIEW v_expiring_documents AS
SELECT 
    d.id AS document_id,
    d.document_number,
    d.document_name,
    d.category,
    d.expiry_date,
    c.client_number,
    c.client_name,
    c.email,
    c.mobile,
    (d.expiry_date - CURRENT_DATE) AS days_until_expiry
FROM jn_documents d
JOIN jn_clients c ON d.client_id = c.id
WHERE d.expiry_date IS NOT NULL 
  AND d.expiry_date <= (CURRENT_DATE + INTERVAL '30 days')
  AND d.deleted_at IS NULL;

-- 4. RLS POLICIES FOR DMS DOMAIN
ALTER TABLE jn_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_verification ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal staff view documents" ON jn_documents FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff upload documents" ON jn_documents FOR ALL USING (is_staff());

CREATE POLICY "Internal staff view document versions" ON jn_document_versions FOR SELECT USING (is_staff());
CREATE POLICY "Internal staff view verifications" ON jn_document_verification FOR SELECT USING (is_staff());
