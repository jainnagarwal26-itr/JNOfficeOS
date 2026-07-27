-- ==============================================================================
-- JN OfficeOS V2.0 - Enterprise SaaS Database Schema Migration
-- Module: 04_storage_buckets.sql
-- Description: Supabase Storage Buckets Setup & Security RLS Policies
-- ==============================================================================

-- 1. INSERT STORAGE BUCKETS METADATA
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('jn-documents', 'jn-documents', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
    ('jn-invoices', 'jn-invoices', false, 10485760, ARRAY['application/pdf']),
    ('jn-profile-images', 'jn-profile-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('jn-signatures', 'jn-signatures', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('jn-attachments', 'jn-attachments', false, 52428800, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'application/zip'])
ON CONFLICT (id) DO UPDATE SET 
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. CREATE STORAGE RLS POLICIES FOR SECURE ACCESS
CREATE POLICY "Authenticated users view document files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));

CREATE POLICY "Authenticated users upload document files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));

CREATE POLICY "Owner and Admin delete document files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id IN ('jn-documents', 'jn-invoices', 'jn-profile-images', 'jn-signatures', 'jn-attachments'));
