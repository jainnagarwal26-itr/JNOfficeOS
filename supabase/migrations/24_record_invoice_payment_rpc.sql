-- ==============================================================================
-- JN OfficeOS V2.5 - Module B: Atomic Invoice Payment & Receipt Transaction RPC
-- Description: Sequence generator, locking mechanism, and atomic transaction for payment receipts
-- ==============================================================================

-- 1. RECEIPT NUMBER SEQUENCE GENERATOR
CREATE SEQUENCE IF NOT EXISTS seq_jn_receipt_number START WITH 1 INCREMENT BY 1;

CREATE OR REPLACE FUNCTION generate_next_receipt_number(fy_str TEXT DEFAULT '2026-27')
RETURNS TEXT AS $$
DECLARE
    next_val BIGINT;
BEGIN
    SELECT nextval('seq_jn_receipt_number') INTO next_val;
    RETURN 'REC/' || fy_str || '/' || LPAD(next_val::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 2. ATOMIC PAYMENT RECORDING TRANSACTION RPC
CREATE OR REPLACE FUNCTION record_invoice_payment(
    p_invoice_id_or_number TEXT,
    p_amount NUMERIC(15,2),
    p_payment_mode payment_mode_enum DEFAULT 'Cash',
    p_transaction_ref VARCHAR(100) DEFAULT NULL,
    p_remarks TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_inv RECORD;
    v_receipt_number TEXT;
    v_receipt_id UUID;
    v_fy_str TEXT;
    v_new_paid NUMERIC(15,2);
    v_new_balance NUMERIC(15,2);
    v_new_status invoice_status_enum;
    v_is_uuid BOOLEAN;
BEGIN
    -- Validate amount
    IF p_amount <= 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount must be greater than zero');
    END IF;

    -- Determine if input is UUID or invoice_number
    v_is_uuid := p_invoice_id_or_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    -- Lock and select target invoice row FOR UPDATE
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

    -- Reject overpayment if amount > balance_due
    IF p_amount > (v_inv.total_amount - v_inv.amount_paid) + 0.01 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Payment amount (₹' || p_amount || ') exceeds remaining balance (₹' || (v_inv.total_amount - v_inv.amount_paid) || ')');
    END IF;

    -- Generate FY string
    IF EXTRACT(MONTH FROM CURRENT_DATE) < 4 THEN
        v_fy_str := (EXTRACT(YEAR FROM CURRENT_DATE) - 1)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM CURRENT_DATE)) % 100)::TEXT, 2, '0');
    ELSE
        v_fy_str := EXTRACT(YEAR FROM CURRENT_DATE)::TEXT || '-' || LPAD(((EXTRACT(YEAR FROM CURRENT_DATE) + 1) % 100)::TEXT, 2, '0');
    END IF;

    -- Generate receipt number
    v_receipt_number := generate_next_receipt_number(v_fy_str);

    -- Insert Receipt
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

    -- Calculate new balance & status
    v_new_paid := v_inv.amount_paid + p_amount;
    v_new_balance := GREATEST(0.00, v_inv.total_amount - v_new_paid);

    IF v_new_balance <= 0 THEN
        v_new_status := 'PAID';
    ELSIF v_new_paid > 0 THEN
        v_new_status := 'PARTIALLY_PAID';
    ELSE
        v_new_status := 'UNPAID';
    END IF;

    -- Update Invoice
    UPDATE public.jn_invoices
    SET
        amount_paid = v_new_paid,
        balance_due = v_new_balance,
        status = v_new_status,
        updated_at = NOW()
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
$$ LANGUAGE plpgsql;
