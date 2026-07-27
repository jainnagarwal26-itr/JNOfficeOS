/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 6: Supabase Storage Integration Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";

export class StorageService {

  /**
   * Upload binary file to targeted Supabase Storage bucket
   */
  async uploadFile(bucketId: string, path: string, file: Blob | ArrayBuffer | File): Promise<{ success: boolean; filePath?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: true, filePath: `mock_storage/${bucketId}/${path}` };
    }

    try {
      const { data, error } = await supabase.storage
        .from(bucketId)
        .upload(path, file, { upsert: true });

      if (error) throw error;
      return { success: true, filePath: data.path };
    } catch (err: any) {
      console.error("[StorageService] uploadFile error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Download binary file from storage
   */
  async downloadFile(bucketId: string, path: string): Promise<Blob | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase.storage
        .from(bucketId)
        .download(path);

      if (error) throw error;
      return data;
    } catch (err) {
      console.error("[StorageService] downloadFile error:", err);
      return null;
    }
  }
}

export const storageService = new StorageService();
