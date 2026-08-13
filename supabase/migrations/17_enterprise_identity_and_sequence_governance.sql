-- ====================================================================
-- JN OfficeOS V2.4 Migration 17: Global Serial Number & User Status Governance
-- Production Data Reconciliation & Enterprise ID Standardization
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- 1. PRODUCTION CLIENT RECONCILIATION (CL000004 -> CL000003)
-- --------------------------------------------------------------------

-- Reconcile Parag Kadam (UUID: 6ea6117f-02d1-4546-8cb9-68d82806bf30) from CL000004 to CL000003
UPDATE public.jn_clients
SET client_number = 'CL000003',
    updated_at = NOW()
WHERE id = '6ea6117f-02d1-4546-8cb9-68d82806bf30'
   OR client_number = 'CL000004';

-- Reconcile linked compliance register records from CL000004 to CL000003
UPDATE public.jn_compliance_register
SET client_id = 'CL000003',
    updated_at = NOW()
WHERE client_id = 'CL000004';

-- Reconcile linked client compliances if any exist
UPDATE public.jn_client_compliances
SET client_id = 'CL000003',
    updated_at = NOW()
WHERE client_id = 'CL000004';

-- --------------------------------------------------------------------
-- 2. BACKEND ATOMIC SEQUENCE FOR CLIENT NUMBERS
-- --------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.seq_client_number START WITH 4 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_next_client_number()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
BEGIN
    SELECT nextval('public.seq_client_number') INTO next_val;
    formatted_id := 'CL' || LPAD(next_val::TEXT, 6, '0');
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 3. STAFF ID STANDARDIZATION (STF000001, STF000002...)
-- --------------------------------------------------------------------

-- Migrate Chirag Jain (Owner) to STF000001
UPDATE public.jn_users
SET user_number = 'STF000001',
    role = 'OWNER',
    updated_at = NOW()
WHERE email = 'jainnagarwal26@gmail.com';

-- Migrate Amit Agrawal (Staff) to STF000002
UPDATE public.jn_users
SET user_number = 'STF000002',
    role = 'STAFF',
    updated_at = NOW()
WHERE email = 'amit@jainnagarwal.in';

-- BACKEND ATOMIC SEQUENCE FOR STAFF NUMBERS
CREATE SEQUENCE IF NOT EXISTS public.seq_staff_number START WITH 3 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_next_staff_number()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
    formatted_id TEXT;
BEGIN
    SELECT nextval('public.seq_staff_number') INTO next_val;
    formatted_id := 'STF' || LPAD(next_val::TEXT, 6, '0');
    RETURN formatted_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --------------------------------------------------------------------
-- 4. AUDIT LOGGING FOR MIGRATION 17 RECONCILIATION
-- --------------------------------------------------------------------

INSERT INTO public.jn_audit_logs (
    user_email, user_name, role, action, category, details, ip_address, created_at
) VALUES 
('system', 'System Core', 'OWNER', 'PRODUCTION_DATA_RECONCILIATION', 'SYSTEM', 
 'Migration 17 applied: Reconciled Parag Kadam to CL000003, standardized Staff IDs to STF000001 (Chirag Jain) and STF000002 (Amit Agrawal), and created atomic sequences for future generation.', 
 '127.0.0.1', NOW());

COMMIT;
