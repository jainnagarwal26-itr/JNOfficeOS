/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Document Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseDocument } from "../types/document";

export class DocumentRepository {

  async fetchAllDocuments(options?: { clientId?: string; category?: string }): Promise<EnterpriseDocument[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_documents")
        .select(`
          *,
          client:jn_clients(client_name),
          versions:jn_document_versions(*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (options?.clientId) {
        query = query.eq("client_id", options.clientId);
      }

      if (options?.category && options.category !== "ALL") {
        query = query.eq("category", options.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        documentNumber: row.document_number,
        clientId: row.client_id,
        clientName: row.client?.client_name || "",
        caseId: row.case_id,
        category: row.category,
        documentName: row.document_name,
        originalFilename: row.original_filename,
        bucketId: row.bucket_id,
        filePath: row.file_path,
        fileSizeBytes: row.file_size_bytes,
        mimeType: row.mime_type,
        checksumSha256: row.checksum_sha256 || "",
        status: row.status,
        issueDate: row.issue_date || "",
        expiryDate: row.expiry_date || "",
        versionNumber: row.version_number,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }));
    } catch (err) {
      console.error("[DocumentRepository] fetchAllDocuments error:", err);
      return [];
    }
  }

  async saveDocument(doc: EnterpriseDocument): Promise<{ success: boolean; data?: EnterpriseDocument; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        document_number: doc.documentNumber,
        client_id: doc.clientId || null,
        case_id: doc.caseId || null,
        category: doc.category,
        document_name: doc.documentName,
        original_filename: doc.originalFilename,
        bucket_id: doc.bucketId || "jn-documents",
        file_path: doc.filePath,
        file_size_bytes: doc.fileSizeBytes || 0,
        mime_type: doc.mimeType || "application/pdf",
        checksum_sha256: doc.checksumSha256 || null,
        status: doc.status || "UPLOADED",
        issue_date: doc.issueDate || null,
        expiry_date: doc.expiryDate || null,
        version_number: doc.versionNumber || 1,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_documents")
        .upsert(payload, { onConflict: "document_number" })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          documentNumber: data.document_number,
          clientId: data.client_id,
          caseId: data.case_id,
          category: data.category,
          documentName: data.document_name,
          originalFilename: data.original_filename,
          bucketId: data.bucket_id,
          filePath: data.file_path,
          fileSizeBytes: data.file_size_bytes,
          mimeType: data.mime_type,
          status: data.status,
          versionNumber: data.version_number,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[DocumentRepository] saveDocument error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const documentRepository = new DocumentRepository();

// Backwards compatibility repository exports for UI components
export class DocumentVersionRepositoryClass {}
export const DocumentVersionRepository = new DocumentVersionRepositoryClass();

export class DocumentVerificationRepositoryClass {}
export const DocumentVerificationRepository = new DocumentVerificationRepositoryClass();

export class DocumentReminderRepositoryClass {}
export const DocumentReminderRepository = new DocumentReminderRepositoryClass();
