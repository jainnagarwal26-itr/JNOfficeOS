-- ==============================================================================
-- JN OfficeOS - Module B: Atomic Invoice Update & Financial Integrity RPC
-- Migration: 26_atomic_invoice_update.sql
-- Description: Transactional RPC for atomic invoice edits, preserving payment
--              history, concurrency locking, and accurate balance recalculation.
--              Supports 0-item legacy invoices as well as multi-item updates.
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_central_invoice(
    p_invoice_id_or_number TEXT,
    p_new_invoice_number VARCHAR(50) DEFAULT NULL,
    p_invoice_type VARCHAR(100) DEFAULT NULL,
    p_invoice_date DATE DEFAULT NULL,
    p_due_date DATE DEFAULT NULL,
    p_client_id UUID DEFAULT NULL,
    p_client_name VARCHAR(255) DEFAULT NULL,
    p_client_gstin VARCHAR(25) DEFAULT NULL,
    p_client_address TEXT DEFAULT NULL,
    p_assigned_staff JSONB DEFAULT NULL,
    p_sub_total NUMERIC(15,2) DEFAULT NULL,
    p_discount_amount NUMERIC(15,2) DEFAULT NULL,
    p_cgst_amount NUMERIC(15,2) DEFAULT NULL,
    p_sgst_amount NUMERIC(15,2) DEFAULT NULL,
    p_igst_amount NUMERIC(15,2) DEFAULT NULL,
    p_gst_amount NUMERIC(15,2) DEFAULT NULL,
    p_total_amount NUMERIC(15,2) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_terms TEXT DEFAULT NULL,
    p_updated_by UUID DEFAULT NULL,
    p_items JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
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
    -- 1. Determine if input is UUID or invoice_number
    v_is_uuid := p_invoice_id_or_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- 2. Lock and select target invoice row FOR UPDATE (Concurrency Protection)
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

    -- 3. Validate line items if provided (0 items is valid for backward compatibility; non-array is rejected)
    IF p_items IS NOT NULL THEN
        IF jsonb_typeof(p_items) != 'array' THEN
            RETURN jsonb_build_object(
                'success', false,
                'error', 'Invalid items payload: must be a JSON array.'
            );
        END IF;
    END IF;

    -- 4. Financial Integrity Calculations (Rules 1-5)
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

    -- 5. Update Invoice Header in public.jn_invoices
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
        updated_by = COALESCE(p_updated_by, v_inv.updated_by)
    WHERE id = v_inv.id;

    -- 6. Atomic Item Synchronization (Same Transaction)
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

    -- 7. Return atomic success payload
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
$$ LANGUAGE plpgsql SECURITY DEFINER;
