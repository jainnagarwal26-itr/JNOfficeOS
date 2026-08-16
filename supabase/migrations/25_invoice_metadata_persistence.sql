-- ==============================================================================
-- JN OfficeOS - Module B: Invoice Metadata Persistence Schema Hardening
-- Migration: 25_invoice_metadata_persistence.sql
-- Description: Additive schema migration to persist invoice_type, discount_amount,
--              assigned_staff, item description, and item discount.
-- Safe, non-destructive, backward-compatible.
-- ==============================================================================

-- 1. ADD METADATA COLUMNS TO jn_invoices
ALTER TABLE public.jn_invoices 
ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(100) DEFAULT 'Tax Invoice',
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(15,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS assigned_staff JSONB DEFAULT '["usr_owner_001"]'::JSONB;

-- 2. ADD METADATA COLUMNS TO jn_invoice_items
ALTER TABLE public.jn_invoice_items 
ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS discount NUMERIC(15,2) DEFAULT 0.00;

-- 3. COMMENTS FOR DOCUMENTATION
COMMENT ON COLUMN public.jn_invoices.invoice_type IS 'Invoice category: Tax Invoice, Bill of Supply, Proforma Invoice, Credit Note, Debit Note, etc.';
COMMENT ON COLUMN public.jn_invoices.discount_amount IS 'Invoice-level flat discount in INR';
COMMENT ON COLUMN public.jn_invoices.assigned_staff IS 'JSON Array of assigned staff IDs or User UUIDs';
COMMENT ON COLUMN public.jn_invoice_items.description IS 'Detailed service / item line description';
COMMENT ON COLUMN public.jn_invoice_items.discount IS 'Line-item level discount in INR';
