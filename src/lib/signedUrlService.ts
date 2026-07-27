/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Secure Signed URL Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export class SignedUrlService {

  /**
   * Generate temporary signed URL for secure file download (default expiry 1 hour)
   */
  async generateSignedUrl(bucketId: string, filePath: string, expiresSeconds: number = 3600): Promise<string | null> {
    if (!isSupabaseConfigured()) {
      return `https://hljwxadlzlfokeyimcbm.supabase.co/storage/v1/object/public/${bucketId}/${filePath}`;
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketId)
        .createSignedUrl(filePath, expiresSeconds);

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      console.error("[SignedUrlService] generateSignedUrl error:", err);
      return null;
    }
  }
}

export const signedUrlService = new SignedUrlService();
