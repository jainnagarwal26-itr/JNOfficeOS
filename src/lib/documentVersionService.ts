/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Document Version Control Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { DocumentVersion } from "../types/document";

export class DocumentVersionService {

  async recordNewVersion(version: DocumentVersion): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase.from("jn_document_versions").insert([{
        document_id: version.documentId,
        version_number: version.versionNumber,
        file_path: version.filePath,
        file_size_bytes: version.fileSizeBytes,
        version_remarks: version.versionRemarks || null
      }]);

      if (error) throw error;

      // Bump version number on master document
      await supabase.from("jn_documents").update({
        version_number: version.versionNumber,
        file_path: version.filePath,
        file_size_bytes: version.fileSizeBytes,
        updated_at: new Date().toISOString()
      }).eq("id", version.documentId);

      return { success: true };
    } catch (err: any) {
      console.error("[DocumentVersionService] recordNewVersion error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const documentVersionService = new DocumentVersionService();
