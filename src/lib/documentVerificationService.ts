/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Document Verification Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export class DocumentVerificationService {

  async verifyDocument(documentId: string, verifierId: string, status: "VERIFIED" | "REJECTED", remarks?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase.from("jn_document_verification").insert([{
        document_id: documentId,
        verifier_id: verifierId,
        verification_status: status,
        remarks: remarks || null
      }]);

      if (error) throw error;

      await supabase.from("jn_documents").update({
        status: status,
        updated_at: new Date().toISOString()
      }).eq("id", documentId);

      return { success: true };
    } catch (err: any) {
      console.error("[DocumentVerificationService] verifyDocument error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const documentVerificationService = new DocumentVerificationService();
