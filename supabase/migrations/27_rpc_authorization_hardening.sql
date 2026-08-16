-- ============================================================================
-- Migration 27: RPC Authorization Hardening & Safe Search Path Configuration
-- Phase 5A: Server-Side Authorization for Billing RPCs
-- ============================================================================

-- 1. HARDEN create_central_invoice
CREATE OR REPLACE FUNCTION public.create_central_invoice(
    p_client_id uuid DEFAULT NULL::uuid,
    p_client_name character varying DEFAULT 'Client'::character varying,
    p_client_gstin character varying DEFAULT NULL::character varying,
    p_client_address text DEFAULT NULL::text,
    p_invoice_date date DEFAULT CURRENT_DATE,
    p_due_date date DEFAULT (CURRENT_DATE + '7 days'::interval),
    p_sub_total numeric DEFAULT 0.00,
    p_cgst_amount numeric DEFAULT 0.00,
    p_sgst_amount numeric DEFAULT 0.00,
    p_igst_amount numeric DEFAULT 0.00,
    p_gst_amount numeric DEFAULT 0.00,
    p_total_amount numeric DEFAULT 0.00,
    p_notes text DEFAULT NULL::text,
    p_terms text DEFAULT NULL::text,
    p_source_module character varying DEFAULT 'INVOICE_ENGINE'::character varying,
    p_source_reference_id character varying DEFAULT NULL::character varying,
    p_created_by uuid DEFAULT NULL::uuid,
    p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_caller_role VARCHAR;
    v_caller_active BOOLEAN;
    v_caller_deleted TIMESTAMPTZ;
    v_invoice_number TEXT;
    v_invoice_id UUID;
    v_item JSONB;
    v_fy_str TEXT;
    v_service_uuid UUID;
BEGIN
    -- 1. Server-Side Caller Validation
    IF p_created_by IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller user UUID (p_created_by) is required.'
        );
    END IF;

    SELECT role::VARCHAR, is_active, deleted_at 
    INTO v_caller_role, v_caller_active, v_caller_deleted
    FROM public.jn_users
    WHERE id = p_created_by;

    IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE OR v_caller_deleted IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller is not an active JN OfficeOS user.'
        );
    END IF;

    IF v_caller_role NOT IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: User role ' || v_caller_role || ' is not authorized to create invoices.'
        );
    END IF;

    -- 2. Validate Items
    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid items payload: must be a JSON array.'
        );
    END IF;

    -- 3. Compute FY string dynamically
    IF EXTRACT(MONTH FROM p_invoice_date) < 4 THEN
        v_fy_str := (EXTRACT(YEAR FROM p_invoice_date) - 1)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM p_invoice_date)) % 100)::TEXT, 2, '0');
    ELSE
        v_fy_str := EXTRACT(YEAR FROM p_invoice_date)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM p_invoice_date) + 1) % 100)::TEXT, 2, '0');
    END IF;

    -- 4. Generate Next Sequence Invoice Number
    v_invoice_number := generate_next_invoice_number(v_fy_str);

    -- 5. Insert Invoice Header
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

    -- 6. Insert Invoice Line Items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_service_uuid := NULL;
        IF (v_item->>'service_id') IS NOT NULL AND (v_item->>'service_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
            v_service_uuid := (v_item->>'service_id')::UUID;
        END IF;

        INSERT INTO public.jn_invoice_items (
            invoice_id,
            service_id,
            service_name,
            description,
            sac_code,
            quantity,
            unit_price,
            discount,
            taxable_amount,
            gst_rate,
            gst_amount,
            total_amount
        ) VALUES (
            v_invoice_id,
            v_service_uuid,
            COALESCE(v_item->>'service_name', 'Professional Services'),
            COALESCE(v_item->>'description', ''),
            COALESCE(v_item->>'sac_code', '998311'),
            COALESCE((v_item->>'quantity')::INT, 1),
            COALESCE((v_item->>'unit_price')::NUMERIC, 0.00),
            COALESCE((v_item->>'discount')::NUMERIC, 0.00),
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
$function$;


-- 2. HARDEN update_central_invoice
CREATE OR REPLACE FUNCTION public.update_central_invoice(
    p_invoice_id_or_number text,
    p_new_invoice_number character varying DEFAULT NULL::character varying,
    p_invoice_type character varying DEFAULT NULL::character varying,
    p_invoice_date date DEFAULT NULL::date,
    p_due_date date DEFAULT NULL::date,
    p_client_id uuid DEFAULT NULL::uuid,
    p_client_name character varying DEFAULT NULL::character varying,
    p_client_gstin character varying DEFAULT NULL::character varying,
    p_client_address text DEFAULT NULL::text,
    p_assigned_staff jsonb DEFAULT NULL::jsonb,
    p_sub_total numeric DEFAULT NULL::numeric,
    p_discount_amount numeric DEFAULT NULL::numeric,
    p_cgst_amount numeric DEFAULT NULL::numeric,
    p_sgst_amount numeric DEFAULT NULL::numeric,
    p_igst_amount numeric DEFAULT NULL::numeric,
    p_gst_amount numeric DEFAULT NULL::numeric,
    p_total_amount numeric DEFAULT NULL::numeric,
    p_notes text DEFAULT NULL::text,
    p_terms text DEFAULT NULL::text,
    p_updated_by uuid DEFAULT NULL::uuid,
    p_items jsonb DEFAULT NULL::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_caller_role VARCHAR;
    v_caller_active BOOLEAN;
    v_caller_deleted TIMESTAMPTZ;
    v_inv RECORD;
    v_is_uuid BOOLEAN;
    v_new_invoice_num TEXT;
    v_new_total NUMERIC(15,2);
    v_amount_paid NUMERIC(15,2);
    v_new_balance NUMERIC(15,2);
    v_new_status invoice_status_enum;
    v_warning TEXT := NULL;
    v_item JSONB;
    v_service_uuid UUID;
BEGIN
    -- 1. Server-Side Caller Validation
    IF p_updated_by IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller user UUID (p_updated_by) is required.'
        );
    END IF;

    SELECT role::VARCHAR, is_active, deleted_at 
    INTO v_caller_role, v_caller_active, v_caller_deleted
    FROM public.jn_users
    WHERE id = p_updated_by;

    IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE OR v_caller_deleted IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller is not an active JN OfficeOS user.'
        );
    END IF;

    IF v_caller_role NOT IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: User role ' || v_caller_role || ' is not authorized to update invoices.'
        );
    END IF;

    -- 2. Determine if input is UUID or invoice_number
    v_is_uuid := p_invoice_id_or_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 3. Lock and select target invoice row FOR UPDATE (Concurrency Protection)
    IF v_is_uuid THEN
        SELECT *
        INTO v_inv
        FROM public.jn_invoices
        WHERE id = p_invoice_id_or_number::UUID
        FOR UPDATE;
    ELSE
        SELECT *
        INTO v_inv
        FROM public.jn_invoices
        WHERE invoice_number = p_invoice_id_or_number
        FOR UPDATE;
    END IF;

    IF v_inv.id IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invoice not found: ' || p_invoice_id_or_number
        );
    END IF;

    IF v_inv.status = 'CANCELLED' THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot edit a cancelled/voided invoice.'
        );
    END IF;

    -- 4. Validate line items if provided (0 items is valid for backward compatibility; non-array is rejected)
    IF p_items IS NOT NULL THEN
        IF jsonb_typeof(p_items) != 'array' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid items payload: must be a JSON array.'
            );
        END IF;
    END IF;

    -- 5. Financial Integrity Calculations (Rules 1-5)
    v_new_total := COALESCE(p_total_amount, v_inv.total_amount);
    v_amount_paid := COALESCE(v_inv.amount_paid, 0.00); -- Sacred payment preservation

    -- Recalculate balance_due = MAX(0, new_total - amount_paid)
    v_new_balance := GREATEST(0.00, v_new_total - v_amount_paid);

    -- Recalculate Status
    IF v_amount_paid <= 0 THEN
        v_new_status := 'UNPAID';
    ELSIF v_amount_paid < v_new_total THEN
        v_new_status := 'PARTIALLY_PAID';
    ELSE
        v_new_status := 'PAID';
    END IF;

    -- Check for overpaid warning condition (Rule 5)
    IF v_amount_paid > v_new_total THEN
        v_warning := 'Paid amount (INR ' || v_amount_paid || ') exceeds revised invoice total (INR ' || v_new_total || '). Refund or credit-note review required.';
    END IF;

    v_new_invoice_num := COALESCE(p_new_invoice_number, v_inv.invoice_number);

    -- 6. Update Invoice Header in public.jn_invoices
    UPDATE public.jn_invoices
    SET
        invoice_number = v_new_invoice_num,
        invoice_type = COALESCE(p_invoice_type, v_inv.invoice_type, 'Tax Invoice'),
        invoice_date = COALESCE(p_invoice_date, v_inv.invoice_date),
        due_date = COALESCE(p_due_date, v_inv.due_date),
        client_id = CASE WHEN p_client_id IS NOT NULL THEN p_client_id ELSE v_inv.client_id END,
        client_name = COALESCE(p_client_name, v_inv.client_name),
        client_gstin = CASE WHEN p_client_gstin IS NOT NULL THEN p_client_gstin ELSE v_inv.client_gstin END,
        client_address = CASE WHEN p_client_address IS NOT NULL THEN p_client_address ELSE v_inv.client_address END,
        assigned_staff = COALESCE(p_assigned_staff, v_inv.assigned_staff, '["usr_owner_001"]'::jsonb),
        sub_total = COALESCE(p_sub_total, v_inv.sub_total),
        discount_amount = COALESCE(p_discount_amount, v_inv.discount_amount, 0.00),
        cgst_amount = COALESCE(p_cgst_amount, v_inv.cgst_amount, 0.00),
        sgst_amount = COALESCE(p_sgst_amount, v_inv.sgst_amount, 0.00),
        igst_amount = COALESCE(p_igst_amount, v_inv.igst_amount, 0.00),
        gst_amount = COALESCE(p_gst_amount, v_inv.gst_amount, 0.00),
        total_amount = v_new_total,
        amount_paid = v_amount_paid,
        balance_due = v_new_balance,
        status = v_new_status,
        notes = CASE WHEN p_notes IS NOT NULL THEN p_notes ELSE v_inv.notes END,
        terms = CASE WHEN p_terms IS NOT NULL THEN p_terms ELSE v_inv.terms END,
        updated_at = NOW(),
        updated_by = p_updated_by
    WHERE id = v_inv.id;

    -- 7. Atomic Item Synchronization (Same Transaction)
    IF p_items IS NOT NULL THEN
        DELETE FROM public.jn_invoice_items WHERE invoice_id = v_inv.id;

        IF jsonb_array_length(p_items) > 0 THEN
            FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
            LOOP
                v_service_uuid := NULL;
                IF (v_item->>'service_id') IS NOT NULL AND (v_item->>'service_id') ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
                    v_service_uuid := (v_item->>'service_id')::UUID;
                END IF;

                INSERT INTO public.jn_invoice_items (
                    invoice_id,
                    service_id,
                    service_name,
                    description,
                    sac_code,
                    quantity,
                    unit_price,
                    discount,
                    taxable_amount,
                    gst_rate,
                    gst_amount,
                    total_amount
                ) VALUES (
                    v_inv.id,
                    v_service_uuid,
                    COALESCE(v_item->>'service_name', 'Professional Services'),
                    COALESCE(v_item->>'description', ''),
                    COALESCE(v_item->>'sac_code', '998311'),
                    COALESCE((v_item->>'quantity')::INT, 1),
                    COALESCE((v_item->>'unit_price')::NUMERIC, 0.00),
                    COALESCE((v_item->>'discount')::NUMERIC, 0.00),
                    COALESCE((v_item->>'taxable_amount')::NUMERIC, 0.00),
                    COALESCE((v_item->>'gst_rate')::NUMERIC, 18.00),
                    COALESCE((v_item->>'gst_amount')::NUMERIC, 0.00),
                    COALESCE((v_item->>'total_amount')::NUMERIC, 0.00)
                );
            END LOOP;
        END IF;
    END IF;

    -- 8. Return atomic success payload
    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv.id,
        'invoice_number', v_new_invoice_num,
        'total_amount', v_new_total,
        'amount_paid', v_amount_paid,
        'balance_due', v_new_balance,
        'status', v_new_status,
        'warning', v_warning
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'update_central_invoice failed: %', SQLERRM;
END;
$function$;


-- 3. HARDEN record_invoice_payment
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
    p_invoice_id_or_number text,
    p_amount numeric,
    p_payment_mode payment_mode_enum DEFAULT 'Cash'::payment_mode_enum,
    p_transaction_ref character varying DEFAULT NULL::character varying,
    p_remarks text DEFAULT NULL::text,
    p_created_by uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
    v_caller_role VARCHAR;
    v_caller_active BOOLEAN;
    v_caller_deleted TIMESTAMPTZ;
    v_inv RECORD;
    v_receipt_number TEXT;
    v_receipt_id UUID;
    v_fy_str TEXT;
    v_new_paid NUMERIC(15,2);
    v_new_balance NUMERIC(15,2);
    v_new_status invoice_status_enum;
    v_is_uuid BOOLEAN;
BEGIN
    -- 1. Server-Side Caller Validation
    IF p_created_by IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller user UUID (p_created_by) is required.'
        );
    END IF;

    SELECT role::VARCHAR, is_active, deleted_at 
    INTO v_caller_role, v_caller_active, v_caller_deleted
    FROM public.jn_users
    WHERE id = p_created_by;

    IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE OR v_caller_deleted IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller is not an active JN OfficeOS user.'
        );
    END IF;

    IF v_caller_role NOT IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: User role ' || v_caller_role || ' is not authorized to record payments.'
        );
    END IF;

    -- 2. Validate Amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero');
    END IF;

    v_is_uuid := p_invoice_id_or_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 3. Lock target invoice row FOR UPDATE
    IF v_is_uuid THEN
        SELECT id, invoice_number, total_amount, amount_paid, balance_due, status, client_id, invoice_date
        INTO v_inv
        FROM public.jn_invoices
        WHERE id = p_invoice_id_or_number::UUID
        FOR UPDATE;
    ELSE
        SELECT id, invoice_number, total_amount, amount_paid, balance_due, status, client_id, invoice_date
        INTO v_inv
        FROM public.jn_invoices
        WHERE invoice_number = p_invoice_id_or_number
        FOR UPDATE;
    END IF;

    IF v_inv.id IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invoice not found: ' || p_invoice_id_or_number);
    END IF;

    IF v_inv.status = 'CANCELLED' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Cannot process payment against a cancelled invoice');
    END IF;

    IF p_amount > (v_inv.total_amount - v_inv.amount_paid) + 0.01 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount (₹' || p_amount || ') exceeds remaining balance (₹' || (v_inv.total_amount - v_inv.amount_paid) || ')');
    END IF;

    -- 4. Compute FY String Dynamically
    IF EXTRACT(MONTH FROM CURRENT_DATE) < 4 THEN
        v_fy_str := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM CURRENT_DATE)) % 100)::TEXT, 2, '0');
    ELSE
        v_fy_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM CURRENT_DATE) + 1) % 100)::TEXT, 2, '0');
    END IF;

    -- 5. Generate Next Sequence Receipt Number
    v_receipt_number := generate_next_receipt_number(v_fy_str);

    -- 6. Insert Receipt Record
    INSERT INTO public.jn_receipts (
        receipt_number,
        receipt_date,
        invoice_id,
        client_id,
        amount_received,
        payment_mode,
        transaction_ref,
        remarks,
        created_by
    ) VALUES (
        v_receipt_number,
        CURRENT_DATE,
        v_inv.id,
        v_inv.client_id,
        p_amount,
        p_payment_mode,
        p_transaction_ref,
        p_remarks,
        p_created_by
    ) RETURNING id INTO v_receipt_id;

    -- 7. Update Invoice Balance & Status
    v_new_paid := v_inv.amount_paid + p_amount;
    v_new_balance := GREATEST(0.00, v_inv.total_amount - v_new_paid);

    IF v_new_balance <= 0 THEN
        v_new_status := 'PAID';
    ELSIF v_new_paid > 0 THEN
        v_new_status := 'PARTIALLY_PAID';
    ELSE
        v_new_status := 'UNPAID';
    END IF;

    UPDATE public.jn_invoices
    SET
        amount_paid = v_new_paid,
        balance_due = v_new_balance,
        status = v_new_status,
        updated_at = NOW(),
        updated_by = p_created_by
    WHERE id = v_inv.id;

    RETURN jsonb_build_object(
        'success', true,
        'receipt_id', v_receipt_id,
        'receipt_number', v_receipt_number,
        'invoice_id', v_inv.id,
        'invoice_number', v_inv.invoice_number,
        'amount_received', p_amount,
        'amount_paid', v_new_paid,
        'balance_due', v_new_balance,
        'status', v_new_status
    );
END;
$function$;
