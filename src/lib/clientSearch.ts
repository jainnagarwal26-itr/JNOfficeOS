/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: Client Full-Text Search Engine
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseClientProfile } from "../types/client";

export class ClientSearchEngine {

  /**
   * Fast Multi-Field Full-Text Search on Name, Trade Name, PAN, GSTIN, Mobile, Email, Client Number
   */
  async searchClients(searchQuery: string): Promise<EnterpriseClientProfile[]> {
    if (!searchQuery || searchQuery.trim() === "") return [];
    if (!isSupabaseConfigured()) return [];

    try {
      const cleanTerm = searchQuery.trim();
      const { data, error } = await supabase
        .from("jn_clients")
        .select("*")
        .is("deleted_at", null)
        .or(`client_name.ilike.%${cleanTerm}%,trade_name.ilike.%${cleanTerm}%,pan.ilike.%${cleanTerm}%,gstin.ilike.%${cleanTerm}%,email.ilike.%${cleanTerm}%,mobile.ilike.%${cleanTerm}%,client_number.ilike.%${cleanTerm}%`)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        clientNumber: row.client_number,
        category: row.category,
        clientName: row.client_name,
        tradeName: row.trade_name || "",
        businessName: row.business_name || "",
        clientSource: row.client_source || "Direct",
        referredBy: row.referred_by || "",
        pan: row.pan || "",
        aadhaar: row.aadhaar || "",
        gstin: row.gstin || "",
        email: row.email || "",
        mobile: row.mobile || "",
        status: row.status || "Active",
        tags: row.tags || []
      }));
    } catch (err) {
      console.error("[ClientSearchEngine] searchClients error:", err);
      return [];
    }
  }
}

export const clientSearchEngine = new ClientSearchEngine();
