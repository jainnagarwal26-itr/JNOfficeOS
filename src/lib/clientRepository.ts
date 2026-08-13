/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: Client Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseClientProfile } from "../types/client";

export class ClientRepository {

  async getAllClients(options?: { category?: string; status?: string }): Promise<EnterpriseClientProfile[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_clients")
        .select(`
          *,
          contacts:jn_client_contacts(*),
          addresses:jn_client_addresses(*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (options?.category && options.category !== "ALL") {
        query = query.eq("category", options.category);
      }

      if (options?.status && options.status !== "ALL") {
        query = query.eq("status", options.status);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => this.mapRowToProfile(row));
    } catch (err) {
      console.error("[ClientRepository] getAllClients error:", err);
      return [];
    }
  }

  async getClientByNumber(clientNumber: string): Promise<EnterpriseClientProfile | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from("jn_clients")
        .select(`
          *,
          contacts:jn_client_contacts(*),
          addresses:jn_client_addresses(*),
          communications:jn_client_communication(*),
          followups:jn_client_followups(*)
        `)
        .eq("client_number", clientNumber)
        .is("deleted_at", null)
        .single();

      if (error || !data) return null;
      return this.mapRowToProfile(data);
    } catch (err) {
      console.error("[ClientRepository] getClientByNumber error:", err);
      return null;
    }
  }

  async saveClientProfile(profile: EnterpriseClientProfile): Promise<{ success: boolean; data?: EnterpriseClientProfile; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const { supabaseService } = await import("./supabaseService");
      const clientNumber = profile.clientNumber || await supabaseService.getNextClientNumber();

      const payload: any = {
        client_number: clientNumber,
        category: profile.category,
        client_name: profile.clientName,
        trade_name: profile.tradeName || null,
        business_name: profile.businessName || null,
        client_source: profile.clientSource || "Direct",
        referred_by: profile.referredBy || null,
        pan: profile.pan ? profile.pan.toUpperCase() : null,
        aadhaar: profile.aadhaar || null,
        gstin: profile.gstin ? profile.gstin.toUpperCase() : null,
        tan: profile.tan || null,
        cin: profile.cin || null,
        llpin: profile.llpin || null,
        msme: profile.msmeRegistration || "None",
        udyam_registration: profile.udyamRegistration || null,
        fssai_number: profile.fssaiNumber || null,
        iec_number: profile.iecNumber || null,
        professional_tax_number: profile.professionalTaxNumber || null,
        pf_number: profile.pfNumber || null,
        esic_number: profile.esicNumber || null,
        office_address: profile.officeAddress || null,
        city: profile.city || null,
        state: profile.state || "Maharashtra",
        pin_code: profile.pinCode || null,
        country: profile.country || "India",
        bank_name: profile.bankName || null,
        account_holder: profile.accountHolder || null,
        account_number: profile.accountNumber || null,
        ifsc: profile.ifscCode || null,
        branch: profile.branchName || null,
        upi: profile.upiId || null,
        business_nature: profile.businessNature || null,
        business_type: profile.businessType || "Services",
        constitution: profile.constitution || "Individual",
        date_of_incorporation: profile.dateOfIncorporation || null,
        date_of_registration: profile.dateOfRegistration || null,
        financial_year: profile.financialYear || "2026-27",
        assessment_year: profile.assessmentYear || "2027-28",
        email: profile.email || null,
        mobile: profile.mobile || null,
        alternate_mobile: profile.alternateMobile || null,
        whatsapp: profile.whatsapp || null,
        website: profile.website || null,
        status: profile.status || "Active",
        tags: profile.tags || [],
        internal_notes: profile.internalNotes || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_clients")
        .upsert(payload, { onConflict: "client_number" })
        .select()
        .single();

      if (error) throw error;

      return { success: true, data: this.mapRowToProfile(data) };
    } catch (err: any) {
      console.error("[ClientRepository] saveClientProfile error:", err);
      return { success: false, error: err.message };
    }
  }

  private mapRowToProfile(row: any): EnterpriseClientProfile {
    return {
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
      tan: row.tan || "",
      cin: row.cin || "",
      llpin: row.llpin || "",
      msmeRegistration: row.msme || "None",
      udyamRegistration: row.udyam_registration || "",
      fssaiNumber: row.fssai_number || "",
      iecNumber: row.iec_number || "",
      professionalTaxNumber: row.professional_tax_number || "",
      pfNumber: row.pf_number || "",
      esicNumber: row.esic_number || "",
      officeAddress: row.office_address || "",
      city: row.city || "",
      state: row.state || "Maharashtra",
      pinCode: row.pin_code || "",
      country: row.country || "India",
      bankName: row.bank_name || "",
      accountHolder: row.account_holder || "",
      accountNumber: row.account_number || "",
      ifscCode: row.ifsc || "",
      branchName: row.branch || "",
      upiId: row.upi || "",
      businessNature: row.business_nature || "",
      businessType: row.business_type || "Services",
      constitution: row.constitution || "Individual",
      dateOfIncorporation: row.date_of_incorporation || "",
      dateOfRegistration: row.date_of_registration || "",
      financialYear: row.financial_year || "2026-27",
      assessmentYear: row.assessment_year || "2027-28",
      email: row.email || "",
      mobile: row.mobile || "",
      alternateMobile: row.alternate_mobile || "",
      whatsapp: row.whatsapp || "",
      website: row.website || "",
      status: row.status || "Active",
      tags: row.tags || [],
      internalNotes: row.internal_notes || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      versionNumber: row.version_number
    };
  }
}

export const clientRepository = new ClientRepository();
