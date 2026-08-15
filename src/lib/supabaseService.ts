/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Service & Repository Access Layer Powered by Supabase PostgreSQL
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { Client, ClientContact } from "../types";

export class SupabaseService {

  // --- CLIENT CRM OPERATIONS ---

  async fetchClients(): Promise<{ success: boolean; data: Client[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, data: [], error: "Supabase credentials not configured in .env" };
    }

    try {
      const { data, error } = await supabase
        .from("jn_clients")
        .select(`
          *,
          contacts:jn_client_contacts(*)
        `)
        .eq("is_active", true)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const clients: Client[] = (data || []).map((row: any) => ({
        id: row.client_number || row.id,
        category: row.category || "Individual",
        name: row.client_name,
        tradeName: row.trade_name || "",
        businessName: row.business_name || "",
        clientSource: row.client_source || "Direct",
        referredBy: row.referred_by || "",
        mobile: row.mobile || "",
        alternateMobile: row.alternate_mobile || "",
        whatsapp: row.whatsapp || row.mobile || "",
        email: row.email || "",
        website: row.website || "",
        pan: row.pan || "",
        aadhaar: row.aadhaar || "",
        gstin: row.gstin || "",
        tan: row.tan || "",
        udyamRegistration: row.udyam_registration || "",
        fssaiNumber: row.fssai_number || "",
        iecNumber: row.iec_number || "",
        professionalTaxNumber: row.professional_tax_number || "",
        pfNumber: row.pf_number || "",
        esicNumber: row.esic_number || "",
        cin: row.cin || "",
        din: row.din || "",
        msme: row.msme || "None",
        officeAddress: row.office_address || "",
        city: row.city || "",
        state: row.state || "Maharashtra",
        pinCode: row.pin_code || "",
        country: row.country || "India",
        bankName: row.bank_name || "",
        accountHolder: row.account_holder || "",
        accountNumber: row.account_number || "",
        ifsc: row.ifsc || "",
        branch: row.branch || "",
        upi: row.upi || "",
        businessNature: row.business_nature || "",
        businessType: row.business_type || "Services",
        constitution: row.constitution || "Individual",
        dateOfIncorporation: row.date_of_incorporation || "",
        dateOfRegistration: row.date_of_registration || "",
        financialYear: row.financial_year || "2026-27",
        assessmentYear: row.assessment_year || "2027-28",
        status: row.status || "Active",
        tags: row.tags || [],
        internalNotes: row.internal_notes || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        contacts: (row.contacts || []).map((cnt: any) => ({
          id: cnt.id,
          clientId: row.client_number || row.id,
          name: cnt.contact_name,
          role: cnt.role,
          email: cnt.email || "",
          phone: cnt.phone || "",
          isPrimary: cnt.is_primary
        }))
      }));

      return { success: true, data: clients };
    } catch (err: any) {
      console.error("[SupabaseService] fetchClients error:", err);
      return { success: false, data: [], error: err.message };
    }
  }

  async upsertClient(client: Client): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured" };
    }

    // Safety Guard: Block accidental upsert of obsolete CL000004 record for Parag Kadam
    const targetClientNumber = client.clientNumber || (client.id && client.id.startsWith("CL") ? client.id : undefined);
    if ((targetClientNumber === "CL000004" || client.id === "CL000004") && (client.name || "").includes("Parag Kadam")) {
      console.warn("[SupabaseService] Blocked attempt to upsert obsolete CL000004 record for Parag Kadam.");
      return { success: false, error: "CL000004 for Parag Kadam is obsolete. Canonical record is CL000003." };
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(client.id || "");
      const payload: any = {
        ...(isUuid ? { id: client.id } : {}),
        client_number: targetClientNumber || client.id,
        category: client.category || "Individual",
        client_name: client.name,
        trade_name: client.tradeName || null,
        business_name: client.businessName || null,
        client_source: client.clientSource || "Direct",
        referred_by: client.referredBy || null,
        pan: client.pan || null,
        aadhaar: client.aadhaar || null,
        gstin: client.gstin || null,
        tan: client.tan || null,
        udyam_registration: client.udyamRegistration || null,
        fssai_number: client.fssaiNumber || null,
        iec_number: client.iecNumber || null,
        professional_tax_number: client.professionalTaxNumber || null,
        pf_number: client.pfNumber || null,
        esic_number: client.esicNumber || null,
        cin: client.cin || null,
        din: client.din || null,
        msme: client.msme || "None",
        office_address: client.officeAddress || null,
        city: client.city || null,
        state: client.state || "Maharashtra",
        pin_code: client.pinCode || null,
        country: client.country || "India",
        bank_name: client.bankName || null,
        account_holder: client.accountHolder || null,
        account_number: client.accountNumber || null,
        ifsc: client.ifsc || null,
        branch: client.branch || null,
        upi: client.upi || null,
        business_nature: client.businessNature || null,
        business_type: client.businessType || "Services",
        constitution: client.constitution || "Individual",
        date_of_incorporation: client.dateOfIncorporation || null,
        date_of_registration: client.dateOfRegistration || null,
        financial_year: client.financialYear || "2026-27",
        assessment_year: client.assessmentYear || "2027-28",
        email: client.email || null,
        mobile: client.mobile || null,
        alternate_mobile: client.alternateMobile || null,
        whatsapp: client.whatsapp || null,
        website: client.website || null,
        status: client.status || "Active",
        tags: client.tags || [],
        internal_notes: client.internalNotes || null,
        updated_at: new Date().toISOString()
      };

      const conflictColumn = isUuid ? "id" : "client_number";
      const { data, error } = await supabase
        .from("jn_clients")
        .upsert(payload, { onConflict: conflictColumn })
        .select()
        .single();

      if (error) throw error;

      // Sync Sub-contacts
      if (client.contacts && client.contacts.length > 0 && data) {
        const contactPayloads = client.contacts.map(c => ({
          client_id: data.id,
          contact_name: c.name,
          role: c.role || "Contact Person",
          email: c.email || null,
          phone: c.phone || null,
          is_primary: c.isPrimary ?? true
        }));
        await supabase.from("jn_client_contacts").upsert(contactPayloads);
      }

      return { success: true, data };
    } catch (err: any) {
      console.error("[SupabaseService] upsertClient error:", err);
      return { success: false, error: err.message };
    }
  }

  // --- NOTIFICATIONS & REALTIME BROADCAST CENTER ---

  async fetchBroadcasts(): Promise<any[]> {
    if (!isSupabaseConfigured()) return [];
    try {
      const { data, error } = await supabase
        .from("jn_broadcasts")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error("[SupabaseService] fetchBroadcasts error:", err);
      return [];
    }
  }

  async publishBroadcast(broadcast: {
    broadcast_type: string;
    target_audience: string;
    subject: string;
    message: string;
    sender_email: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { data, error } = await supabase
        .from("jn_broadcasts")
        .insert([{
          broadcast_type: broadcast.broadcast_type,
          target_audience: broadcast.target_audience,
          subject: broadcast.subject,
          message: broadcast.message,
          sender_email: broadcast.sender_email,
          is_active: true
        }])
        .select()
        .single();
      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("[SupabaseService] publishBroadcast error:", err);
      return { success: false, error: err.message };
    }
  }

  subscribeToBroadcasts(callback: (newBroadcast: any) => void): () => void {
    if (!isSupabaseConfigured()) return () => {};

    const channel = supabase
      .channel("realtime-broadcasts")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "jn_broadcasts" },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  // --- STORAGE BUCKETS OPERATIONS ---

  async uploadDocument(
    bucket: "jn-documents" | "jn-invoices" | "jn-profile-images" | "jn-signatures" | "jn-attachments",
    filePath: string,
    fileBody: Blob | File
  ): Promise<{ success: boolean; publicUrl?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileBody, { upsert: true });

      if (error) throw error;

      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(data.path);
      return { success: true, publicUrl: urlData.publicUrl };
    } catch (err: any) {
      console.error("[SupabaseService] uploadDocument error:", err);
      return { success: false, error: err.message };
    }
  }

  // --- ATOMIC SEQUENCE & GLOBAL GOVERNANCE METHODS ---

  async getNextClientNumber(): Promise<string> {
    if (!isSupabaseConfigured()) return "CL000004";
    try {
      const { data, error } = await supabase.rpc("generate_next_client_number");
      if (error || !data) {
        const { data: clients } = await supabase.from("jn_clients").select("client_number").order("client_number", { ascending: false }).limit(1);
        if (clients && clients.length > 0) {
          const lastNum = parseInt(clients[0].client_number.replace(/\D/g, ""), 10) || 3;
          return `CL${String(lastNum + 1).padStart(6, "0")}`;
        }
        return "CL000004";
      }
      return data;
    } catch (e) {
      console.warn("[SupabaseService] Fallback generating client number:", e);
      return "CL000004";
    }
  }

  async getNextStaffNumber(): Promise<string> {
    if (!isSupabaseConfigured()) return `STF${String(Date.now()).slice(-6)}`;
    try {
      const { data, error } = await supabase.rpc("generate_next_staff_number");
      if (error || !data) {
        const { data: users } = await supabase.from("jn_users").select("user_number").order("user_number", { ascending: false }).limit(1);
        if (users && users.length > 0) {
          const lastNum = parseInt(users[0].user_number.replace(/\D/g, ""), 10) || 2;
          return `STF${String(lastNum + 1).padStart(6, "0")}`;
        }
        return "STF000003";
      }
      return data;
    } catch (e) {
      console.warn("[SupabaseService] Fallback generating staff number:", e);
      return `STF${String(Date.now()).slice(-6)}`;
    }
  }

  async toggleUserActiveStatus(userEmail: string, isActive: boolean, actorUser: string = "system"): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { error } = await supabase
        .from("jn_users")
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq("email", userEmail.toLowerCase().trim());

      if (error) throw error;

      await this.logAudit({
        userEmail: actorUser,
        userName: actorUser,
        role: "OWNER",
        action: isActive ? "STAFF_ACTIVATED" : "STAFF_DEACTIVATED",
        category: "AUTH",
        details: `Staff member (${userEmail}) status updated to ${isActive ? "ACTIVE" : "DEACTIVATED"} centrally by ${actorUser}.`,
        timestamp: new Date().toISOString()
      });

      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] toggleUserActiveStatus error:", err);
      return { success: false, error: err.message };
    }
  }

  // --- USER & COMPLIANCE DATA SYNC METHODS ---

  async getUsersFromSupabase(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { data, error } = await supabase
        .from("jn_users")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      return { success: true, data: data || [] };
    } catch (err: any) {
      console.error("[SupabaseService] getUsersFromSupabase error:", err);
      return { success: false, error: err.message };
    }
  }

  async getProfileByEmail(email: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { data, error } = await supabase
        .from("jn_users")
        .select("*")
        .eq("email", email.toLowerCase().trim())
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return { success: true, data: data || null };
    } catch (err: any) {
      console.error("[SupabaseService] getProfileByEmail error:", err);
      return { success: false, error: err.message };
    }
  }

  async signInWithSupabase(email: string, password: string): Promise<{ success: boolean; data?: any; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password
      });

      if (error) throw error;
      return { success: true, data };
    } catch (err: any) {
      console.error("[SupabaseService] signInWithSupabase error:", err);
      return { success: false, error: err.message };
    }
  }

  async signOutFromSupabase(): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] signOutFromSupabase error:", err);
      return { success: false, error: err.message };
    }
  }

  async resetPasswordInSupabase(email: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.toLowerCase().trim());
      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] resetPasswordInSupabase error:", err);
      return { success: false, error: err.message };
    }
  }

  async upsertUser(user: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const payload = {
        user_number: user.username || user.userNumber || user.id,
        email: user.email.toLowerCase().trim(),
        password_hash: user.passwordHash || "$2a$10$UnusedPlaceholderHashForSSO",
        full_name: user.name || user.fullName,
        role: String(user.role).toUpperCase(),
        phone: user.mobile || user.phone || null,
        department: user.department || "Taxation",
        designation: user.designation || "Managing CA & Owner",
        is_active: user.status !== "INACTIVE" && user.isActive !== false,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("jn_users")
        .upsert(payload, { onConflict: "email" });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] upsertUser error:", err);
      return { success: false, error: err.message };
    }
  }

  async logAudit(log: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const payload = {
        user_email: log.userEmail || "system",
        user_name: log.userName || "System Core",
        role: log.role || "OWNER",
        action: log.action || "SYSTEM_EVENT",
        category: log.category || "SYSTEM",
        details: log.details || "",
        ip_address: "127.0.0.1",
        created_at: log.timestamp || new Date().toISOString()
      };

      await supabase.from("jn_audit_logs").insert([payload]);
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] logAudit error:", err);
      return { success: false, error: err.message };
    }
  }

  async upsertComplianceRegisterRecord(record: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const payload = {
        record_id: record.recordId || record.id,
        client_id: record.clientId,
        compliance_code: record.complianceCode,
        compliance_name: record.complianceName,
        category: record.category,
        fy: record.fy,
        ay: record.ay,
        period: record.period,
        due_date: record.dueDate,
        filed_date: record.filedDate || null,
        status: record.status || "NOT_STARTED",
        ack_number: record.ackNumber || null,
        assigned_staff_id: record.assignedStaffId || null,
        remarks: record.remarks || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("jn_compliance_register")
        .upsert(payload, { onConflict: "record_id" });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] upsertComplianceRegisterRecord error:", err);
      return { success: false, error: err.message };
    }
  }

  async upsertInvoice(invoice: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const paid = (invoice.payments || []).reduce((sum: number, p: any) => sum + (p.amount || 0), 0);
      const grandTotal = invoice.grandTotal || invoice.total_amount || 0;
      const balance = Math.max(0, grandTotal - paid);

      const statusMap: Record<string, string> = {
        "Paid": "PAID",
        "Unpaid": "UNPAID",
        "Partially Paid": "PARTIALLY_PAID",
        "Overdue": "OVERDUE",
        "Cancelled": "CANCELLED"
      };

      const payload = {
        invoice_number: invoice.id || invoice.invoiceNumber,
        invoice_date: invoice.date || new Date().toISOString().split("T")[0],
        due_date: invoice.dueDate || invoice.date,
        client_name: invoice.clientName,
        client_gstin: invoice.clientGstin || null,
        client_address: invoice.billingAddress || null,
        sub_total: invoice.subTotal || grandTotal,
        cgst_amount: invoice.cgstTotal || 0,
        sgst_amount: invoice.sgstTotal || 0,
        igst_amount: invoice.igstTotal || 0,
        gst_amount: invoice.totalTax || ((invoice.cgstTotal || 0) + (invoice.sgstTotal || 0) + (invoice.igstTotal || 0)),
        total_amount: grandTotal,
        amount_paid: paid,
        balance_due: balance,
        status: statusMap[invoice.status] || invoice.status || "UNPAID",
        notes: invoice.notes || null,
        terms: invoice.termsConditions || invoice.terms || null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("jn_invoices")
        .upsert(payload, { onConflict: "invoice_number" });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] upsertInvoice error:", err);
      return { success: false, error: err.message };
    }
  }

  async upsertCase(c: any): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const payload = {
        case_number: c.id || c.caseNumber,
        case_title: c.serviceName || c.caseTitle,
        category: c.category || "TAXATION",
        status: c.status || "Work Started",
        priority: c.priority || "Medium",
        due_date: c.expectedCompletionDate || c.dueDate || null,
        financial_year: c.financialYear || "2026-27",
        remarks: c.notes ? JSON.stringify(c.notes) : null,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from("jn_cases")
        .upsert(payload, { onConflict: "case_number" });

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] upsertCase error:", err);
      return { success: false, error: err.message };
    }
  }

  async getInvoices(): Promise<{ success: boolean; data?: any[]; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { CentralInvoiceRepository } = await import("./centralInvoiceRepository");
      return await CentralInvoiceRepository.getInvoices();
    } catch (err: any) {
      console.error("[SupabaseService] getInvoices error:", err);
      return { success: false, error: err.message };
    }
  }

  async deleteInvoice(invoiceNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };
    try {
      const { error } = await supabase
        .from("jn_invoices")
        .delete()
        .eq("invoice_number", invoiceNumber);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[SupabaseService] deleteInvoice error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const supabaseService = new SupabaseService();
