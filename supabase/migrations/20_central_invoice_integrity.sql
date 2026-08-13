-- ==============================================================================
-- JN OfficeOS V2.4 - Module B: Central Invoice Integrity Governance DDL & Functions
-- Description: Schema extensions, sequence generator, and transactional RPC for central invoice generation
-- ==============================================================================

-- 1. SCHEMA EXTENSION FOR SOURCE TRACKING
ALTER TABLE public.jn_invoices 
ADD COLUMN IF NOT EXISTS source_module VARCHAR(100) DEFAULT 'INVOICE_ENGINE',
ADD COLUMN IF NOT EXISTS source_reference_id VARCHAR(100);

-- 2. INVOICE NUMBER SEQUENCE GENERATOR
CREATE SEQUENCE IF NOT EXISTS seq_jn_invoice_number START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_next_invoice_number(fy_str TEXT DEFAULT '2026-27')
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    SELECT nextval('seq_jn_invoice_number') INTO next_val;
    RETURN 'JNA/' || fy_str || '/' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 3. ATOMIC TRANSACTIONAL INVOICE CREATION RPC
CREATE OR REPLACE FUNCTION create_central_invoice(
    p_client_id UUID,
    p_client_name VARCHAR(255),
    p_client_gstin VARCHAR(25),
    p_client_address TEXT,
    p_invoice_date DATE,
    p_due_date DATE,
    p_sub_total NUMERIC(15,2),
    p_cgst_amount NUMERIC(15,2),
    p_sgst_amount NUMERIC(15,2),
    p_igst_amount NUMERIC(15,2),
    p_gst_amount NUMERIC(15,2),
    p_total_amount NUMERIC(15,2),
    p_notes TEXT,
    p_terms TEXT,
    p_source_module VARCHAR(100),
    p_source_reference_id VARCHAR(100),
    p_created_by UUID,
    p_items JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_invoice_number TEXT;
    v_invoice_id UUID;
    v_item JSONB;
    v_fy_str TEXT;
BEGIN
    -- Validate Client UUID
    IF p_client_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.jn_clients WHERE id = p_client_id AND deleted_at IS NULL) THEN
        RAISE EXCEPTION 'Invalid or missing canonical Client UUID: %', p_client_id;
    END IF;

    -- Compute FY string
    IF EXTRACT(MONTH FROM p_invoice_date) < 4 THEN
        v_fy_str := (EXTRACT(YEAR FROM p_invoice_date) - 1)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM p_invoice_date)) % 100)::TEXT, 2, '0');
    ELSE
        v_fy_str := EXTRACT(YEAR FROM p_invoice_date)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM p_invoice_date) + 1) % 100)::TEXT, 2, '0');
    END IF;

    -- Generate Next Invoice Number
    v_invoice_number := generate_next_invoice_number(v_fy_str);

    -- Insert Invoice Header
    INSERT INTO public.jn_invoices (
        invoice_number,
        invoice_date,
        due_date,
        client_id,
        client_name,
        client_gstin,
        client_address,
        sub_total,
        cgst_amount,
        sgst_amount,
        igst_amount,
        gst_amount,
        total_amount,
        amount_paid,
        balance_due,
        status,
        notes,
        terms,
        source_module,
        source_reference_id,
        created_by
    ) VALUES (
        v_invoice_number,
        p_invoice_date,
        p_due_date,
        p_client_id,
        p_client_name,
        p_client_gstin,
        p_client_address,
        p_sub_total,
        p_cgst_amount,
        p_sgst_amount,
        p_igst_amount,
        p_gst_amount,
        p_total_amount,
        0.00,
        p_total_amount,
        'UNPAID',
        p_notes,
        p_terms,
        COALESCE(p_source_module, 'INVOICE_ENGINE'),
        p_source_reference_id,
        p_created_by
    ) RETURNING id INTO v_invoice_id;

    -- Insert Invoice Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        INSERT INTO public.jn_invoice_items (
            invoice_id,
            service_id,
            service_name,
            sac_code,
            quantity,
            unit_price,
            taxable_amount,
            gst_rate,
            gst_amount,
            total_amount
        ) VALUES (
            v_invoice_id,
            (v_item->>'service_id')::UUID,
            v_item->>'service_name',
            COALESCE(v_item->>'sac_code', '998311'),
            COALESCE((v_item->>'quantity')::INT, 1),
            COALESCE((v_item->>'unit_price')::NUMERIC, 0.00),
            COALESCE((v_item->>'taxable_amount')::NUMERIC, 0.00),
            COALESCE((v_item->>'gst_rate')::NUMERIC, 18.00),
            COALESCE((v_item->>'gst_amount')::NUMERIC, 0.00),
            COALESCE((v_item->>'total_amount')::NUMERIC, 0.00)
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_invoice_id,
        'invoice_number', v_invoice_number
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'create_central_invoice failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql;

-- 4. HARDENED RLS POLICIES FOR INVOICES
ALTER TABLE public.jn_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jn_invoice_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Invoices read policy" ON public.jn_invoices;
DROP POLICY IF EXISTS "Invoices insert/update policy" ON public.jn_invoices;

CREATE POLICY "Invoices read policy" ON public.jn_invoices
FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND (role IN ('OWNER', 'SUPERADMIN') OR is_active = true))
);

CREATE POLICY "Invoices insert/update policy" ON public.jn_invoices
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.jn_users WHERE id = auth.uid() AND (role IN ('OWNER', 'SUPERADMIN') OR is_active = true))
);
