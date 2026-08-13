-- ====================================================================
-- JN OfficeOS Migration 18: Dynamic Service Catalog & Client Service Management
-- Target Database: Supabase PostgreSQL 16+
-- ====================================================================

BEGIN;

-- 1. Create client-service assignment table (jn_client_services)
CREATE TABLE IF NOT EXISTS public.jn_client_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.jn_clients(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.jn_services(id) ON DELETE RESTRICT,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    frequency VARCHAR(50) DEFAULT 'Monthly',
    assigned_fee NUMERIC(15,2) DEFAULT 0.00,
    assigned_to UUID REFERENCES public.jn_users(id),
    start_date DATE DEFAULT CURRENT_DATE,
    end_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(client_id, service_id)
);

-- 2. RLS POLICIES FOR SERVICE MASTER & CLIENT SERVICES
ALTER TABLE public.jn_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jn_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jn_client_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read service categories" ON public.jn_service_categories;
CREATE POLICY "Allow read service categories" ON public.jn_service_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write service categories" ON public.jn_service_categories;
CREATE POLICY "Allow write service categories" ON public.jn_service_categories FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read services" ON public.jn_services;
CREATE POLICY "Allow read services" ON public.jn_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write services" ON public.jn_services;
CREATE POLICY "Allow write services" ON public.jn_services FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow read client services" ON public.jn_client_services;
CREATE POLICY "Allow read client services" ON public.jn_client_services FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow write client services" ON public.jn_client_services;
CREATE POLICY "Allow write client services" ON public.jn_client_services FOR ALL USING (true);

-- 3. Create Service Number sequence & generator function
CREATE SEQUENCE IF NOT EXISTS public.seq_service_number START WITH 30 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION public.generate_next_service_number()
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    SELECT nextval('public.seq_service_number') INTO next_val;
    RETURN 'SRV' || LPAD(next_val::TEXT, 5, '0');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Populate 7 Master Categories in jn_service_categories
INSERT INTO public.jn_service_categories (category_name, description, display_order, is_active)
VALUES 
('GST Services', 'Goods and Services Tax filings, LUT, and registrations', 1, true),
('Income Tax / ITR', 'Income tax returns, tax audit, and assessment support', 2, true),
('TDS & TCS', 'Tax Deducted at Source quarterly returns and challans', 3, true),
('Labour & Statutory Compliances', 'PF, ESIC, Professional Tax (PTEC & PTRC)', 4, true),
('Licences & Government Registrations', 'FSSAI, Udyam MSME, Shop Act, IEC, Trademark', 5, true),
('ROC & Corporate Law', 'MCA filings, company incorporation, DIR-3 KYC', 6, true),
('Accounting, Audit & Advisory', 'Financial statements, statutory audit, loans & bookkeeping', 7, true)
ON CONFLICT (category_name) DO UPDATE SET is_active = true;

-- 5. Populate All 29 Services in jn_services, linking category_id dynamically
INSERT INTO public.jn_services (service_number, service_name, category_id, category_name, standard_fee, sac_code, gst_rate, description, is_active)
SELECT s.service_number, s.service_name, c.id, c.category_name, s.standard_fee, s.sac_code, s.gst_rate, s.description, true
FROM (VALUES
    ('SRV00001', 'GST Return - GSTR-1', 'GST Services', 1500.00, '998311', 18.00, 'Statement of outward supplies'),
    ('SRV00002', 'GST Return - GSTR-3B', 'GST Services', 1500.00, '998311', 18.00, 'Monthly self-declared summary GST return'),
    ('SRV00003', 'GST Annual Return - GSTR-9', 'GST Services', 5000.00, '998311', 18.00, 'Comprehensive annual GST return'),
    ('SRV00004', 'GST Registration Services', 'GST Services', 2500.00, '998311', 18.00, 'Fresh GST identification number setup'),
    ('SRV00005', 'GST LUT Filing (Form RFD-11)', 'GST Services', 1500.00, '998311', 18.00, 'Letter of Undertaking for tax-free exports'),
    ('SRV00006', 'Income Tax Return - ITR-1 (Sahaj)', 'Income Tax / ITR', 1000.00, '998311', 18.00, 'Salary and single house property filing'),
    ('SRV00007', 'Income Tax Return - ITR-4 (Sugam)', 'Income Tax / ITR', 2500.00, '998311', 18.00, 'Presumptive business income 44AD/44ADA'),
    ('SRV00008', 'Income Tax Return - ITR-2 / ITR-3', 'Income Tax / ITR', 4000.00, '998311', 18.00, 'Capital gains and business returns'),
    ('SRV00009', 'Tax Audit u/s 44AB', 'Income Tax / ITR', 15000.00, '998311', 18.00, 'Tax Audit report filing 3CA/3CB & 3CD'),
    ('SRV00010', 'TDS Quarterly Returns', 'TDS & TCS', 2000.00, '998311', 18.00, 'Form 24Q and 26Q quarterly returns'),
    ('SRV00011', 'TCS Quarterly Return', 'TDS & TCS', 2000.00, '998311', 18.00, 'Form 27EQ collection returns'),
    ('SRV00012', 'TDS Challan 281 / Form 16 / Form 16A', 'TDS & TCS', 1000.00, '998311', 18.00, 'TDS payment and certificate issuance'),
    ('SRV00013', 'PF Monthly ECR Return', 'Labour & Statutory Compliances', 1500.00, '998311', 18.00, 'EPFO wage list & monthly return'),
    ('SRV00014', 'ESIC Monthly Wage Contribution', 'Labour & Statutory Compliances', 1500.00, '998311', 18.00, 'ESIC wage contribution mapping & payment'),
    ('SRV00015', 'Professional Tax - PTEC', 'Labour & Statutory Compliances', 1500.00, '998311', 18.00, 'Professional Tax Enrollment Certificate services'),
    ('SRV00016', 'Professional Tax - PTRC', 'Labour & Statutory Compliances', 1500.00, '998311', 18.00, 'Professional Tax Registration Certificate employer return'),
    ('SRV00017', 'FSSAI Food License', 'Licences & Government Registrations', 3000.00, '998311', 18.00, 'FOSCOS Form B food business registration'),
    ('SRV00018', 'Udyam MSME Certificate Registration', 'Licences & Government Registrations', 1000.00, '998311', 18.00, 'MSME classification certificate'),
    ('SRV00019', 'Shop & Establishment License / Shop Act / Gumasta', 'Licences & Government Registrations', 2000.00, '998311', 18.00, 'Municipal shop act registration'),
    ('SRV00020', 'Import Export Code (IEC)', 'Licences & Government Registrations', 2500.00, '998311', 18.00, 'DGFT IEC registration and annual update'),
    ('SRV00021', 'Trademark & IP Registration', 'Licences & Government Registrations', 7500.00, '998311', 18.00, 'Brand protection and trademark filing'),
    ('SRV00022', 'Company Incorporation', 'ROC & Corporate Law', 10000.00, '998311', 18.00, 'SPICe+ MCA company incorporation setup'),
    ('SRV00023', 'LLP Annual Filing', 'ROC & Corporate Law', 5000.00, '998311', 18.00, 'Form 11 Annual Return & Form 8 Accounts'),
    ('SRV00024', 'ROC Annual Filings', 'ROC & Corporate Law', 7500.00, '998311', 18.00, 'Form AOC-4 & MGT-7 annual returns'),
    ('SRV00025', 'DIR-3 KYC', 'ROC & Corporate Law', 1000.00, '998311', 18.00, 'Director KYC verification'),
    ('SRV00026', 'Financial Statement & Balance Sheet Preparation', 'Accounting, Audit & Advisory', 5000.00, '998311', 18.00, 'Annual financial statement preparation'),
    ('SRV00027', 'Bank Loan CMA Data & Project Report Preparation', 'Accounting, Audit & Advisory', 7500.00, '998311', 18.00, 'CMA data & project report for bank financing'),
    ('SRV00028', 'Statutory Audit & Concurrent Audit', 'Accounting, Audit & Advisory', 15000.00, '998311', 18.00, 'Statutory audit & compliance review'),
    ('SRV00029', 'Payroll Processing & Bookkeeping', 'Accounting, Audit & Advisory', 3000.00, '998311', 18.00, 'Monthly bookkeeping and wage processing')
) AS s(service_number, service_name, category_name, standard_fee, sac_code, gst_rate, description)
JOIN public.jn_service_categories c ON c.category_name = s.category_name
ON CONFLICT (service_number) DO NOTHING;

COMMIT;
```,Description:
