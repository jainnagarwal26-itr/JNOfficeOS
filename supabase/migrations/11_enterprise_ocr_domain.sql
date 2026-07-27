-- ====================================================================
-- JN OfficeOS V2.1 Migration 11: Enterprise OCR & IDP Domain
-- Additive DDL Schema for OCR Jobs, Results, Classification & Field Extraction
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

-- 1. Enum Types for OCR & IDP Domain
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocr_job_status') THEN
        CREATE TYPE ocr_job_status AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'document_classification_type') THEN
        CREATE TYPE document_classification_type AS ENUM (
            'PAN_CARD',
            'AADHAAR_CARD',
            'GST_CERTIFICATE',
            'ITR_ACKNOWLEDGEMENT',
            'FORM_16',
            'INVOICE',
            'RECEIPT',
            'CANCELLED_CHEQUE',
            'BANK_STATEMENT',
            'BALANCE_SHEET',
            'PROFIT_LOSS_STATEMENT',
            'AUDIT_REPORT',
            'UNKNOWN'
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ocr_provider_enum') THEN
        CREATE TYPE ocr_provider_enum AS ENUM (
            'GOOGLE_DOCUMENT_AI',
            'AZURE_DOCUMENT_INTELLIGENCE',
            'AWS_TEXTRACT',
            'TESSERACT',
            'GEMINI_VISION',
            'OPENAI_VISION',
            'BROWSER_VISION_FALLBACK'
        );
    END IF;
END $$;

-- 2. OCR Processing Queue Table
CREATE TABLE IF NOT EXISTS jn_ocr_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id VARCHAR(64) UNIQUE NOT NULL,
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    client_id VARCHAR(64),
    status ocr_job_status NOT NULL DEFAULT 'PENDING',
    provider ocr_provider_enum NOT NULL DEFAULT 'BROWSER_VISION_FALLBACK',
    priority INT NOT NULL DEFAULT 5, -- 1 Highest, 10 Lowest
    retry_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 3,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_by VARCHAR(255)
);

-- 3. OCR Text Output & Full-Text Search Table
CREATE TABLE IF NOT EXISTS jn_ocr_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id VARCHAR(64) UNIQUE NOT NULL,
    job_id UUID REFERENCES jn_ocr_jobs(id) ON DELETE CASCADE,
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    raw_text TEXT NOT NULL,
    page_count INT NOT NULL DEFAULT 1,
    language VARCHAR(32) DEFAULT 'eng',
    overall_confidence NUMERIC(5,2) DEFAULT 0.00, -- 0.00 to 100.00
    provider_metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. Page-Level OCR Extraction Table
CREATE TABLE IF NOT EXISTS jn_ocr_pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id VARCHAR(64) UNIQUE NOT NULL,
    result_id UUID REFERENCES jn_ocr_results(id) ON DELETE CASCADE,
    page_number INT NOT NULL DEFAULT 1,
    page_text TEXT NOT NULL,
    width INT,
    height INT,
    confidence NUMERIC(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. Document Classification Table
CREATE TABLE IF NOT EXISTS jn_document_classification (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    classification_id VARCHAR(64) UNIQUE NOT NULL,
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    result_id UUID REFERENCES jn_ocr_results(id) ON DELETE SET NULL,
    document_type document_classification_type NOT NULL DEFAULT 'UNKNOWN',
    confidence NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. Extracted Document Fields Table
CREATE TABLE IF NOT EXISTS jn_document_fields (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    field_id VARCHAR(64) UNIQUE NOT NULL,
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    result_id UUID REFERENCES jn_ocr_results(id) ON DELETE CASCADE,
    field_name VARCHAR(128) NOT NULL, -- e.g. 'pan_number', 'gstin', 'invoice_amount'
    field_value TEXT NOT NULL,
    normalized_value TEXT,
    field_type VARCHAR(64) DEFAULT 'text', -- 'text', 'number', 'date', 'currency', 'boolean'
    confidence NUMERIC(5,2) NOT NULL DEFAULT 0.00,
    page_number INT DEFAULT 1,
    bounding_box JSONB DEFAULT '{}'::jsonb, -- { x, y, width, height }
    validation_status VARCHAR(32) DEFAULT 'VALIDATED', -- 'VALIDATED', 'WARNING', 'FAILED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. Document Field Validation Audit Table
CREATE TABLE IF NOT EXISTS jn_document_validation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    validation_id VARCHAR(64) UNIQUE NOT NULL,
    document_id UUID REFERENCES jn_documents(id) ON DELETE CASCADE,
    rule_code VARCHAR(128) NOT NULL, -- e.g. 'VAL_PAN_FORMAT', 'VAL_INVOICE_MATH'
    rule_name VARCHAR(255) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PASSED', -- 'PASSED', 'WARNING', 'FAILED'
    error_message TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ====================================================================
-- PERFORMANCE INDEXES & FULL-TEXT SEARCH GIN
-- ====================================================================

CREATE INDEX IF NOT EXISTS idx_ocr_jobs_status ON jn_ocr_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ocr_jobs_document ON jn_ocr_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_ocr_results_document ON jn_ocr_results(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_fields_document ON jn_document_fields(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_fields_name ON jn_document_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_doc_classification_doc ON jn_document_classification(document_id);

-- Full-text GIN index on OCR raw text using english regconfig (PostgreSQL Immutable requirement)
CREATE INDEX IF NOT EXISTS idx_ocr_results_full_text ON jn_ocr_results USING gin(to_tsvector('english'::regconfig, raw_text));

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE jn_ocr_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_ocr_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_ocr_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_classification ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE jn_document_validation ENABLE ROW LEVEL SECURITY;

-- Permissive RLS for authenticated practice staff
CREATE POLICY "Allow practice staff full access to jn_ocr_jobs" ON jn_ocr_jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_ocr_results" ON jn_ocr_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_ocr_pages" ON jn_ocr_pages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_document_classification" ON jn_document_classification FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_document_fields" ON jn_document_fields FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow practice staff full access to jn_document_validation" ON jn_document_validation FOR ALL USING (true) WITH CHECK (true);
