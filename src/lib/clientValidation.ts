/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: Client Validation & Duplicate Prevention Engine
 */

import { EnterpriseClientProfile } from "../types/client";
import { supabase, isSupabaseConfigured } from "./supabase";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export class ClientValidation {
  private PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  private GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  private EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  /**
   * Validate Client Form Fields
   */
  validateProfile(client: Partial<EnterpriseClientProfile>): ValidationResult {
    const errors: string[] = [];

    if (!client.clientName || client.clientName.trim() === "") {
      errors.push("Client Full / Business Name is required.");
    }

    if (client.pan && client.pan.trim() !== "") {
      const cleanPan = client.pan.trim().toUpperCase();
      if (!this.PAN_REGEX.test(cleanPan)) {
        errors.push("Invalid PAN Format (Expected e.g. ABCDE1234F).");
      }
    }

    if (client.gstin && client.gstin.trim() !== "") {
      const cleanGstin = client.gstin.trim().toUpperCase();
      if (!this.GSTIN_REGEX.test(cleanGstin)) {
        errors.push("Invalid GSTIN Format (Expected 15-character GSTIN).");
      }
    }

    if (client.email && client.email.trim() !== "") {
      if (!this.EMAIL_REGEX.test(client.email.trim())) {
        errors.push("Invalid Email Address format.");
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Check Duplicate Records in Database
   */
  async checkDuplicateClient(
    pan?: string,
    gstin?: string,
    email?: string,
    excludeClientNumber?: string
  ): Promise<{ isDuplicate: boolean; duplicateField?: string; existingClientName?: string }> {
    if (!isSupabaseConfigured()) {
      return { isDuplicate: false };
    }

    try {
      if (pan && pan.trim() !== "") {
        let query = supabase.from("jn_clients").select("client_name, client_number").eq("pan", pan.trim().toUpperCase()).is("deleted_at", null);
        if (excludeClientNumber) query = query.neq("client_number", excludeClientNumber);
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          return { isDuplicate: true, duplicateField: "PAN", existingClientName: data[0].client_name };
        }
      }

      if (gstin && gstin.trim() !== "") {
        let query = supabase.from("jn_clients").select("client_name, client_number").eq("gstin", gstin.trim().toUpperCase()).is("deleted_at", null);
        if (excludeClientNumber) query = query.neq("client_number", excludeClientNumber);
        const { data } = await query.limit(1);
        if (data && data.length > 0) {
          return { isDuplicate: true, duplicateField: "GSTIN", existingClientName: data[0].client_name };
        }
      }

      return { isDuplicate: false };
    } catch (err) {
      console.error("[ClientValidation] checkDuplicateClient error:", err);
      return { isDuplicate: false };
    }
  }
}

export const clientValidation = new ClientValidation();
