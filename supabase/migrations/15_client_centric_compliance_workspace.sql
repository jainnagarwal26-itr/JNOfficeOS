-- ====================================================================
-- JN OfficeOS V2.3 Migration 15: Enterprise Client-Centric Compliance Workspace
-- Additive DDL Schema for Form Types (ITR-1 to 7, GSTR-1/3B/9/CMP-08, 24Q/26Q/27Q/27EQ)
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

-- 1. Add Sub-Type & Form-Type columns to Compliance Register Table
ALTER TABLE jn_compliance_register 
ADD COLUMN IF NOT EXISTS sub_type VARCHAR(32),
ADD COLUMN IF NOT EXISTS form_type VARCHAR(32);

-- 2. Performance Indexing for Client-Centric Compliance Queries
CREATE INDEX IF NOT EXISTS idx_comp_reg_client_fy ON jn_compliance_register(client_id, fy, compliance_code);
CREATE INDEX IF NOT EXISTS idx_comp_reg_form_type ON jn_compliance_register(form_type);

-- 3. Row Level Security (RLS) Policy Verification
ALTER TABLE jn_compliance_register ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow practice staff full access to jn_compliance_register" ON jn_compliance_register;
CREATE POLICY "Allow practice staff full access to jn_compliance_register" ON jn_compliance_register FOR ALL USING (true) WITH CHECK (true);
