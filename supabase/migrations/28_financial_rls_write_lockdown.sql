-- ============================================================================
-- Migration 28: Financial RLS Write Lockdown & delete_central_invoice RPC
-- Phase 5C: Strict RPC-Write-Only Financial Architecture
-- ============================================================================

-- 1. CREATE delete_central_invoice RPC
CREATE OR REPLACE FUNCTION public.delete_central_invoice(
    p_invoice_id_or_number text,
    p_deleted_by uuid DEFAULT NULL::uuid
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
    v_receipt_count INT;
BEGIN
    -- 1. Server-Side Caller Validation (Phase 5A Authorization Model)
    IF p_deleted_by IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller user UUID (p_deleted_by) is required.'
        );
    END IF;

    SELECT role::VARCHAR, is_active, deleted_at 
    INTO v_caller_role, v_caller_active, v_caller_deleted
    FROM public.jn_users
    WHERE id = p_deleted_by;

    IF v_caller_role IS NULL OR v_caller_active IS NOT TRUE OR v_caller_deleted IS NOT NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Unauthorized: Caller is not an active JN OfficeOS user.'
        );
    END IF;

    IF v_caller_role NOT IN ('OWNER', 'SUPER_ADMIN', 'ADMINISTRATOR', 'MANAGER', 'STAFF') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Forbidden: User role ' || v_caller_role || ' is not authorized to delete invoices.'
        );
    END IF;

    -- 2. Identify target invoice
    v_is_uuid := p_invoice_id_or_number ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

    IF v_is_uuid THEN
        SELECT id, invoice_number, total_amount, amount_paid, status
        INTO v_inv
        FROM public.jn_invoices
        WHERE id = p_invoice_id_or_number::UUID
        FOR UPDATE;
    ELSE
        SELECT id, invoice_number, total_amount, amount_paid, status
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

    -- 3. Check Payment History Protection (Objective 4)
    SELECT COUNT(*) INTO v_receipt_count
    FROM public.jn_receipts
    WHERE invoice_id = v_inv.id;

    IF v_receipt_count > 0 OR COALESCE(v_inv.amount_paid, 0.00) > 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invoice cannot be physically deleted because payment history exists (' || v_receipt_count || ' receipt(s) recorded). Please cancel or void the invoice instead.'
        );
    END IF;

    -- 4. Atomic Deletion of Line Items & Invoice Header
    DELETE FROM public.jn_invoice_items WHERE invoice_id = v_inv.id;
    DELETE FROM public.jn_invoices WHERE id = v_inv.id;

    RETURN jsonb_build_object(
        'success', true,
        'invoice_id', v_inv.id,
        'invoice_number', v_inv.invoice_number,
        'message', 'Invoice ' || v_inv.invoice_number || ' permanently deleted.'
    );
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'delete_central_invoice failed: %', SQLERRM;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.delete_central_invoice(text, uuid) TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_central_invoice TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_central_invoice TO PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment TO PUBLIC;

-- 2. FINANCIAL RLS WRITE LOCKDOWN ON jn_invoices
DROP POLICY IF EXISTS "Allow practice staff full access to jn_invoices" ON public.jn_invoices;
DROP POLICY IF EXISTS "Owner and Admin manage invoices" ON public.jn_invoices;
DROP POLICY IF EXISTS "Invoices allow delete" ON public.jn_invoices;
DROP POLICY IF EXISTS "Invoices allow insert" ON public.jn_invoices;
DROP POLICY IF EXISTS "Invoices allow update" ON public.jn_invoices;
DROP POLICY IF EXISTS "Invoices allow read" ON public.jn_invoices;
DROP POLICY IF EXISTS "Full finance view for internal staff" ON public.jn_invoices;

-- Read-only policy for public/anon/authenticated
CREATE POLICY "Invoices allow read" ON public.jn_invoices
    FOR SELECT TO public
    USING (true);

-- Revoke direct table mutation grants
REVOKE INSERT, UPDATE, DELETE ON public.jn_invoices FROM anon, authenticated, PUBLIC;


-- 3. FINANCIAL RLS WRITE LOCKDOWN ON jn_invoice_items
DROP POLICY IF EXISTS "Invoice items allow delete" ON public.jn_invoice_items;
DROP POLICY IF EXISTS "Invoice items allow insert" ON public.jn_invoice_items;
DROP POLICY IF EXISTS "Invoice items allow update" ON public.jn_invoice_items;
DROP POLICY IF EXISTS "Invoice items allow read" ON public.jn_invoice_items;

-- Read-only policy for public/anon/authenticated
CREATE POLICY "Invoice items allow read" ON public.jn_invoice_items
    FOR SELECT TO public
    USING (true);

-- Revoke direct table mutation grants
REVOKE INSERT, UPDATE, DELETE ON public.jn_invoice_items FROM anon, authenticated, PUBLIC;


-- 4. FINANCIAL RLS WRITE LOCKDOWN ON jn_receipts
DROP POLICY IF EXISTS "Allow full access to jn_receipts" ON public.jn_receipts;
DROP POLICY IF EXISTS "Receipts allow read" ON public.jn_receipts;

-- Read-only policy for public/anon/authenticated
CREATE POLICY "Receipts allow read" ON public.jn_receipts
    FOR SELECT TO public
    USING (true);

-- Revoke direct table mutation grants
REVOKE INSERT, UPDATE, DELETE ON public.jn_receipts FROM anon, authenticated, PUBLIC;
