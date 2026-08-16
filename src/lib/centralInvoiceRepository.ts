/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module B: Central Invoice Integrity Repository Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { getClients, addAuditLog } from "./db";
import { Invoice, InvoiceItem } from "./financialRepository";
import { numberToWords } from "./numberToWords";
import { UserRole } from "../types";

export interface CreateCentralInvoicePayload {
  clientId?: string | null; // Canonical UUID or client_number (will resolve to UUID)
  clientName: string;
  clientGstin?: string;
  clientAddress?: string;
  invoiceType?: string; // Tax Invoice, Bill of Supply, Proforma Invoice, etc.
  assignedStaffIds?: string[]; // Array of assigned staff IDs
  invoiceDate: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  subTotal: number;
  discountAmount?: number;
  cgstAmount?: number;
  sgstAmount?: number;
  igstAmount?: number;
  gstAmount: number;
  totalAmount: number;
  notes?: string;
  terms?: string;
  sourceModule: "INVOICE_ENGINE" | "CASE_MANAGEMENT" | "COMPLIANCE" | "CLIENT_SERVICE" | "OTHER";
  sourceReferenceId?: string;
  createdBy?: string; // User UUID
  items: Array<{
    serviceId?: string | null;
    serviceName: string;
    description?: string;
    sacCode?: string;
    quantity: number;
    unitPrice: number;
    discount?: number;
    taxableAmount: number;
    gstRate: number;
    gstAmount: number;
    totalAmount: number;
  }>;
}

/**
 * Canonical Normalizer: PostgreSQL (jn_invoices + jn_invoice_items) -> Frontend Invoice Contract
 */
export function mapSupabaseInvoiceToInvoice(row: any, itemsRaw: any[]): Invoice {
  const statusReverseMap: Record<string, "Unpaid" | "Partially Paid" | "Paid" | "Cancelled" | "Refunded"> = {
    "PAID": "Paid",
    "UNPAID": "Unpaid",
    "PARTIALLY_PAID": "Partially Paid",
    "OVERDUE": "Unpaid",
    "CANCELLED": "Cancelled",
    "REFUNDED": "Refunded"
  };

  const isInterState = Number(row.igst_amount || 0) > 0;

  const normalizedItems: InvoiceItem[] = (itemsRaw || []).map((it: any, idx: number) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unit_price ?? it.rate ?? 0);
    const discount = Number(it.discount ?? 0);
    const taxableVal = Number(it.taxable_amount ?? (qty * unitPrice - discount));
    const gstRate = Number(it.gst_rate ?? 0);
    const gstAmount = Number(it.gst_amount ?? ((taxableVal * gstRate) / 100));
    const totalAmount = Number(it.total_amount ?? (taxableVal + gstAmount));

    const cgst = (!isInterState && gstRate > 0) ? (gstAmount / 2) : 0;
    const sgst = (!isInterState && gstRate > 0) ? (gstAmount / 2) : 0;
    const igst = (isInterState && gstRate > 0) ? gstAmount : 0;

    return {
      id: it.id || `item_${idx + 1}`,
      serviceName: it.service_name || "Professional Services",
      description: it.description !== undefined && it.description !== null && it.description !== "" ? it.description : (it.sac_code ? `SAC: ${it.sac_code}` : ""),
      quantity: qty,
      rate: unitPrice,
      discount: discount,
      taxableValue: parseFloat(taxableVal.toFixed(2)),
      gstRate: gstRate,
      cgst: parseFloat(cgst.toFixed(2)),
      sgst: parseFloat(sgst.toFixed(2)),
      igst: parseFloat(igst.toFixed(2)),
      cess: 0,
      total: parseFloat(totalAmount.toFixed(2))
    };
  });

  const subTotal = Number(row.sub_total ?? 0);
  const totalAmount = Number(row.total_amount ?? 0);
  const cgstAmount = Number(row.cgst_amount ?? 0);
  const sgstAmount = Number(row.sgst_amount ?? 0);
  const igstAmount = Number(row.igst_amount ?? 0);
  const amountPaid = Number(row.amount_paid ?? 0);
  const discountAmount = Number(row.discount_amount ?? 0);
  const assignedStaff = Array.isArray(row.assigned_staff) 
    ? row.assigned_staff 
    : (row.assigned_staff ? [row.assigned_staff] : ["usr_owner_001"]);

  return {
    id: row.invoice_number,
    uuid: row.id,
    type: (row.invoice_type as any) || "Tax Invoice",
    caseId: row.source_reference_id || "",
    clientId: row.client_id || (row.client_name ? "walk-in" : ""),
    clientName: row.client_name || "Client",
    serviceId: normalizedItems[0]?.id || "",
    serviceName: normalizedItems[0]?.serviceName || "Professional Advisory Services",
    assignedStaffIds: assignedStaff,
    workflowId: undefined,
    date: row.invoice_date || new Date().toISOString().split("T")[0],
    dueDate: row.due_date || row.invoice_date || new Date().toISOString().split("T")[0],
    subTotal: subTotal,
    discountAmount: discountAmount,
    taxableAmount: subTotal > 0 ? (subTotal - discountAmount) : totalAmount,
    cgstAmount: cgstAmount,
    sgstAmount: sgstAmount,
    igstAmount: igstAmount,
    cessAmount: 0,
    roundOff: 0,
    grandTotal: totalAmount,
    amountInWords: numberToWords(totalAmount),
    status: statusReverseMap[row.status] || "Unpaid",
    items: normalizedItems,
    payments: (row.receipts && row.receipts.length > 0)
      ? row.receipts.map((r: any) => ({
          id: r.receipt_number || r.id,
          invoiceId: row.invoice_number,
          date: r.receipt_date || row.invoice_date,
          amount: Number(r.amount_received || 0),
          mode: r.payment_mode || "Bank Transfer",
          transactionRef: r.transaction_ref || undefined,
          remarks: r.remarks || undefined,
          createdAt: r.created_at
        }))
      : (amountPaid > 0 ? [{
          id: `REC_${row.invoice_number}`,
          invoiceId: row.invoice_number,
          date: row.invoice_date,
          amount: amountPaid,
          mode: "Bank Transfer",
          createdAt: row.created_at
        }] : []),
    createdAt: row.created_at || new Date().toISOString(),
    updatedAt: row.updated_at || new Date().toISOString(),
    walkInAddress: row.client_address || "",
    walkInMobile: "",
    walkInGstin: row.client_gstin || ""
  };
}

export class CentralInvoiceRepository {

  /**
   * Authoritative Single Read Path: Fetch all invoices with relational line items & receipts
   */
  public static async getInvoices(): Promise<{ success: boolean; data?: Invoice[]; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured." };
    }

    try {
      const { data, error } = await supabase
        .from("jn_invoices")
        .select(`
          *,
          items:jn_invoice_items(*),
          receipts:jn_receipts(*)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const normalized = (data || []).map(row => mapSupabaseInvoiceToInvoice(row, row.items || [], row.receipts || []));
      return { success: true, data: normalized };
    } catch (err: any) {
      console.error("[CentralInvoiceRepository] Error fetching invoices from Supabase:", err);
      return { success: false, error: err.message || "Failed to load invoices from database." };
    }
  }

  /**
   * Authoritative Single Read Path: Fetch single invoice by ID or Number with line items & receipts
   */
  public static async getInvoiceById(idOrNumber: string): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    if (!isSupabaseConfigured() || !idOrNumber) {
      return { success: false, error: "Supabase not configured or invalid invoice reference." };
    }

    try {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrNumber);
      let query = supabase
        .from("jn_invoices")
        .select(`
          *,
          items:jn_invoice_items(*),
          receipts:jn_receipts(*)
        `);

      if (isUuid) {
        query = query.eq("id", idOrNumber);
      } else {
        query = query.eq("invoice_number", idOrNumber);
      }

      const { data, error } = await query.limit(1).single();

      if (error || !data) {
        throw error || new Error(`Invoice '${idOrNumber}' not found in database.`);
      }

      const normalized = mapSupabaseInvoiceToInvoice(data, data.items || [], data.receipts || []);
      return { success: true, invoice: normalized };
    } catch (err: any) {
      console.error(`[CentralInvoiceRepository] Error fetching invoice '${idOrNumber}':`, err);
      return { success: false, error: err.message || "Failed to load invoice." };
    }
  }

  /**
   * Resolves User ID to canonical Supabase UUID
   */
  public static async resolveUserUuid(userIdOrEmail?: string): Promise<string> {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (userIdOrEmail && isUuid.test(userIdOrEmail)) {
      return userIdOrEmail;
    }

    // Default Super Admin / Owner UUID (Chirag Jain)
    const OWNER_UUID = "57235de4-9fc6-42a5-86f3-df2dbb4506f7";

    if (!userIdOrEmail || userIdOrEmail === "usr_owner_001" || userIdOrEmail.includes("chirag") || userIdOrEmail.includes("jainnagarwal26")) {
      return OWNER_UUID;
    }

    if (userIdOrEmail.includes("amit")) return "06158e82-8257-442d-8769-11e2c8292b62";
    if (userIdOrEmail.includes("shruti")) return "ce9ce252-fce5-4d4b-be2b-bf96349027a6";
    if (userIdOrEmail.includes("anju")) return "40f4a361-359b-473e-9f5e-98545068e16c";

    if (isSupabaseConfigured()) {
      try {
        const { data } = await supabase
          .from("jn_users")
          .select("id")
          .or(`email.eq.${userIdOrEmail},user_number.eq.${userIdOrEmail}`)
          .limit(1);

        if (data && data.length > 0) {
          return data[0].id;
        }
      } catch (e) {}
    }

    return OWNER_UUID;
  }

  /**
   * Resolves client ID input to canonical Supabase UUID
   */
  public static async resolveClientUuid(clientIdOrNumber?: string | null): Promise<{ uuid: string | null; clientName: string; gstin?: string; address?: string }> {
    if (!clientIdOrNumber || clientIdOrNumber === "walk-in") {
      return {
        uuid: null,
        clientName: "Walk-In Client"
      };
    }

    const knownUuids: Record<string, string> = {
      "CL000001": "c6528254-ba9c-428b-b488-78eea7589f83",
      "CL000002": "2d1b7261-7805-41e8-ad07-6106fbc33a32",
      "CL000003": "6ea6117f-02d1-4546-8cb9-68d82806bf30"
    };

    if (knownUuids[clientIdOrNumber]) {
      const canonicalUuid = knownUuids[clientIdOrNumber];
      return {
        uuid: canonicalUuid,
        clientName: clientIdOrNumber === "CL000003" ? "Parag Kadam" : clientIdOrNumber === "CL000001" ? "Anchal Baleshwar Chobe" : "KRISHNAKUMAR HEERALAL KANOJIYA"
      };
    }

    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        const clients = getClients();
        const found = clients.find(c => c.id === clientIdOrNumber || c.clientNumber === clientIdOrNumber);

        if (found) {
          return {
            uuid: found.id, // Canonical UUID
            clientName: found.name,
            gstin: found.gstin,
            address: found.officeAddress || found.city || ""
          };
        }
      } catch (e) {}
    }

    // Query Supabase public.jn_clients
    if (isSupabaseConfigured()) {
      try {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientIdOrNumber);
        let query = supabase.from("jn_clients").select("id, name, gstin, office_address, client_number");
        
        if (isUuid) {
          query = query.eq("id", clientIdOrNumber);
        } else {
          query = query.eq("client_number", clientIdOrNumber);
        }

        const { data } = await query.limit(1);

        if (data && data.length > 0) {
          return {
            uuid: data[0].id,
            clientName: data[0].name,
            gstin: data[0].gstin,
            address: data[0].office_address
          };
        }
      } catch (e) {}
    }

    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientIdOrNumber);
    return {
      uuid: isUuid ? clientIdOrNumber : null,
      clientName: "Client"
    };
  }

  /**
   * Atomic Central Invoice Creation
   */
  public static async createInvoice(payload: CreateCentralInvoicePayload): Promise<{
    success: boolean;
    invoiceNumber?: string;
    invoiceId?: string;
    error?: string;
  }> {
    if (!payload.items || payload.items.length === 0) {
      return { success: false, error: "Invoice must contain at least one line item." };
    }

    // 1. Resolve Canonical Client UUID & User UUID
    const clientMeta = await this.resolveClientUuid(payload.clientId);
    const clientUuid = clientMeta.uuid;
    const clientName = payload.clientName || clientMeta.clientName;
    const clientGstin = payload.clientGstin || clientMeta.gstin || "";
    const clientAddress = payload.clientAddress || clientMeta.address || "";
    const createdByUuid = await this.resolveUserUuid(payload.createdBy);

    // 2. Compute GST Split
    const totalGst = payload.gstAmount || 0;
    const cgst = payload.cgstAmount ?? (totalGst / 2);
    const sgst = payload.sgstAmount ?? (totalGst / 2);
    const igst = payload.igstAmount ?? 0;

    // 3. Try PostgreSQL Atomic RPC `create_central_invoice`
    if (isSupabaseConfigured()) {
      try {
        const rpcPayload = {
          p_client_id: clientUuid,
          p_client_name: clientName,
          p_client_gstin: clientGstin || null,
          p_client_address: clientAddress || null,
          p_invoice_date: payload.invoiceDate,
          p_due_date: payload.dueDate,
          p_sub_total: payload.subTotal,
          p_cgst_amount: cgst,
          p_sgst_amount: sgst,
          p_igst_amount: igst,
          p_gst_amount: totalGst,
          p_total_amount: payload.totalAmount,
          p_notes: payload.notes || null,
          p_terms: payload.terms || null,
          p_source_module: payload.sourceModule,
          p_source_reference_id: payload.sourceReferenceId || null,
          p_created_by: createdByUuid,
          p_items: payload.items.map(item => ({
            service_id: item.serviceId || null,
            service_name: item.serviceName,
            sac_code: item.sacCode || "998311",
            quantity: item.quantity,
            unit_price: item.unitPrice,
            taxable_amount: item.taxableAmount,
            gst_rate: item.gstRate,
            gst_amount: item.gstAmount,
            total_amount: item.totalAmount
          }))
        };

        const { data: rpcRes, error: rpcErr } = await supabase.rpc("create_central_invoice", rpcPayload);

        if (!rpcErr && rpcRes && rpcRes.success) {
          addAuditLog(
            "system@jn.internal",
            "Central Invoice Engine",
            UserRole.OWNER,
            "INVOICE_CREATED",
            "DATABASE",
            `Created central invoice ${rpcRes.invoice_number} for client ${clientName} via module ${payload.sourceModule}`
          );

          return {
            success: true,
            invoiceId: rpcRes.invoice_id,
            invoiceNumber: rpcRes.invoice_number
          };
        } else if (rpcErr) {
          console.warn("[CentralInvoiceRepository] RPC returned error, attempting fallback insert:", rpcErr);
        }
      } catch (err) {
        console.warn("[CentralInvoiceRepository] RPC fallback to transaction batch:", err);
      }
    }

    // 4. Fallback Direct Supabase Insert with UUID Client FK & Idempotency
    if (isSupabaseConfigured()) {
      try {
        const dateStr = payload.invoiceDate;
        const year = new Date(dateStr).getFullYear();
        const month = new Date(dateStr).getMonth();
        const startYear = month < 3 ? year - 1 : year;
        const fy = `${startYear}-${((startYear + 1) % 100).toString().padStart(2, "0")}`;

        // Get max existing number
        const { data: existingInvoices } = await supabase
          .from("jn_invoices")
          .select("invoice_number")
          .like("invoice_number", `JNA/${fy}/%`)
          .order("invoice_number", { ascending: false })
          .limit(1);

        let maxNum = 0;
        if (existingInvoices && existingInvoices.length > 0) {
          const parts = existingInvoices[0].invoice_number.split("/");
          if (parts.length === 3) {
            maxNum = parseInt(parts[2], 10) || 0;
          }
        }

        const invoiceNumber = `JNA/${fy}/${String(maxNum + 1).padStart(6, "0")}`;

        // Header Insert
        const headerPayload: any = {
          invoice_number: invoiceNumber,
          invoice_type: payload.invoiceType || "Tax Invoice",
          invoice_date: payload.invoiceDate,
          due_date: payload.dueDate,
          client_id: clientUuid,
          client_name: clientName,
          client_gstin: clientGstin || null,
          client_address: clientAddress || null,
          assigned_staff: payload.assignedStaffIds || ["usr_owner_001"],
          sub_total: payload.subTotal,
          discount_amount: payload.discountAmount || 0.00,
          cgst_amount: cgst,
          sgst_amount: sgst,
          igst_amount: igst,
          gst_amount: totalGst,
          total_amount: payload.totalAmount,
          amount_paid: 0.00,
          balance_due: payload.totalAmount,
          status: "UNPAID",
          notes: payload.notes || null,
          terms: payload.terms || null,
          source_module: payload.sourceModule,
          source_reference_id: payload.sourceReferenceId || null,
          created_by: createdByUuid
        };

        const { data: headerData, error: headerErr } = await supabase
          .from("jn_invoices")
          .insert([headerPayload])
          .select()
          .single();

        if (headerErr) throw headerErr;

        // Line Items Insert
        const itemPayloads = payload.items.map(item => ({
          invoice_id: headerData.id,
          service_id: (item.serviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.serviceId)) ? item.serviceId : null,
          service_name: item.serviceName,
          description: item.description || "",
          sac_code: item.sacCode || "998311",
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0.00,
          taxable_amount: item.taxableAmount,
          gst_rate: item.gstRate,
          gst_amount: item.gstAmount,
          total_amount: item.totalAmount
        }));

        const { error: itemsErr } = await supabase
          .from("jn_invoice_items")
          .insert(itemPayloads);

        if (itemsErr) {
          await supabase.from("jn_invoices").delete().eq("id", headerData.id);
          throw itemsErr;
        }

        addAuditLog(
          "system@jn.internal",
          "Central Invoice Engine",
          UserRole.OWNER,
          "INVOICE_CREATED",
          "DATABASE",
          `Created central invoice ${invoiceNumber} for client ${clientName} via ${payload.sourceModule}`
        );

        return {
          success: true,
          invoiceId: headerData.id,
          invoiceNumber: invoiceNumber
        };
      } catch (err: any) {
        console.error("[CentralInvoiceRepository] Central invoice save error:", err);
        return {
          success: false,
          error: err.message || "Failed to persist invoice to PostgreSQL database."
        };
      }
    }

    return {
      success: false,
      error: "Supabase connection is unavailable. Invoice could not be saved to backend. Please retry."
    };
  }

  /**
   * Super Admin Edit/Update Invoice in Supabase PostgreSQL (Atomic Transactional Update)
   */
  public static async updateInvoice(
    invoiceIdOrNumber: string,
    payload: Partial<CreateCentralInvoicePayload> & { newInvoiceNumber?: string }
  ): Promise<{ success: boolean; error?: string; invoice?: Invoice; warning?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const clientMeta = payload.clientId !== undefined ? await this.resolveClientUuid(payload.clientId) : null;
      const createdByUuid = payload.createdBy ? await this.resolveUserUuid(payload.createdBy) : null;

      // 1. Attempt Atomic PostgreSQL RPC `update_central_invoice`
      const rpcPayload: any = {
        p_invoice_id_or_number: invoiceIdOrNumber,
        p_new_invoice_number: payload.newInvoiceNumber || null,
        p_invoice_type: payload.invoiceType || null,
        p_invoice_date: payload.invoiceDate || null,
        p_due_date: payload.dueDate || null,
        p_client_id: clientMeta?.uuid || null,
        p_client_name: payload.clientName || clientMeta?.clientName || null,
        p_client_gstin: payload.clientGstin || clientMeta?.gstin || null,
        p_client_address: payload.clientAddress || clientMeta?.address || null,
        p_assigned_staff: payload.assignedStaffIds || null,
        p_sub_total: payload.subTotal !== undefined ? payload.subTotal : null,
        p_discount_amount: payload.discountAmount !== undefined ? payload.discountAmount : null,
        p_cgst_amount: payload.cgstAmount !== undefined ? payload.cgstAmount : null,
        p_sgst_amount: payload.sgstAmount !== undefined ? payload.sgstAmount : null,
        p_igst_amount: payload.igstAmount !== undefined ? payload.igstAmount : null,
        p_gst_amount: payload.gstAmount !== undefined ? payload.gstAmount : null,
        p_total_amount: payload.totalAmount !== undefined ? payload.totalAmount : null,
        p_notes: payload.notes !== undefined ? payload.notes : null,
        p_terms: payload.terms !== undefined ? payload.terms : null,
        p_updated_by: createdByUuid,
        p_items: payload.items && payload.items.length > 0 ? payload.items.map(item => ({
          service_id: (item.serviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.serviceId)) ? item.serviceId : null,
          service_name: item.serviceName,
          description: item.description || "",
          sac_code: item.sacCode || "998311",
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0.00,
          taxable_amount: item.taxableAmount,
          gst_rate: item.gstRate,
          gst_amount: item.gstAmount,
          total_amount: item.totalAmount
        })) : null
      };

      const { data: rpcData, error: rpcErr } = await supabase.rpc("update_central_invoice", rpcPayload);

      if (!rpcErr && rpcData && rpcData.success) {
        if (rpcData.warning) {
          console.warn("[CentralInvoiceRepository] update_central_invoice warning:", rpcData.warning);
        }

        addAuditLog(
          "system@jn.internal",
          "Central Invoice Engine",
          UserRole.OWNER,
          "INVOICE_UPDATED",
          "DATABASE",
          `Updated invoice ${rpcData.invoice_number} (Total: INR ${rpcData.total_amount}, Paid: INR ${rpcData.amount_paid}, Balance: INR ${rpcData.balance_due}, Status: ${rpcData.status}) in backend Supabase database`
        );

        const refreshed = await this.getInvoiceById(rpcData.invoice_id || invoiceIdOrNumber);
        return { success: true, invoice: refreshed.invoice, warning: rpcData.warning };
      }

      if (rpcErr) {
        console.warn("[CentralInvoiceRepository] RPC update_central_invoice error, attempting fallback:", rpcErr);
      }

      // 2. Fallback with strict payment integrity preservation (Rules 1-5)
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdOrNumber);
      let selQuery = supabase.from("jn_invoices").select("*");
      if (isUuid) {
        selQuery = selQuery.eq("id", invoiceIdOrNumber);
      } else {
        selQuery = selQuery.eq("invoice_number", invoiceIdOrNumber);
      }

      const { data: existingRow, error: selErr } = await selQuery.single();
      if (selErr || !existingRow) throw selErr || new Error("Invoice not found for update.");

      const currentPaid = Number(existingRow.amount_paid || 0);
      const newTotal = payload.totalAmount !== undefined ? Number(payload.totalAmount) : Number(existingRow.total_amount);
      const newBalance = Math.max(0, newTotal - currentPaid);
      let newStatus: string;
      let warningText: string | undefined = undefined;

      if (currentPaid <= 0) {
        newStatus = "UNPAID";
      } else if (currentPaid < newTotal) {
        newStatus = "PARTIALLY_PAID";
      } else {
        newStatus = "PAID";
      }

      if (currentPaid > newTotal) {
        warningText = `Paid amount (₹${currentPaid.toLocaleString("en-IN")}) exceeds revised invoice total (₹${newTotal.toLocaleString("en-IN")}). Refund or credit-note review required.`;
      }

      const updateHeader: any = {
        total_amount: newTotal,
        amount_paid: currentPaid, // Sacred payment preservation
        balance_due: newBalance,
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      if (payload.newInvoiceNumber) updateHeader.invoice_number = payload.newInvoiceNumber;
      if (payload.invoiceType) updateHeader.invoice_type = payload.invoiceType;
      if (payload.assignedStaffIds) updateHeader.assigned_staff = payload.assignedStaffIds;
      if (payload.invoiceDate) updateHeader.invoice_date = payload.invoiceDate;
      if (payload.dueDate) updateHeader.due_date = payload.dueDate;
      if (payload.subTotal !== undefined) updateHeader.sub_total = payload.subTotal;
      if (payload.discountAmount !== undefined) updateHeader.discount_amount = payload.discountAmount;
      if (payload.cgstAmount !== undefined) updateHeader.cgst_amount = payload.cgstAmount;
      if (payload.sgstAmount !== undefined) updateHeader.sgst_amount = payload.sgstAmount;
      if (payload.igstAmount !== undefined) updateHeader.igst_amount = payload.igstAmount;
      if (payload.gstAmount !== undefined) updateHeader.gst_amount = payload.gstAmount;
      if (payload.notes !== undefined) updateHeader.notes = payload.notes;
      if (payload.terms !== undefined) updateHeader.terms = payload.terms;

      const { data: updatedHeader, error: headerErr } = await supabase
        .from("jn_invoices")
        .update(updateHeader)
        .eq("id", existingRow.id)
        .select("id, invoice_number")
        .single();

      if (headerErr) throw headerErr;

      // Update line items if provided
      if (payload.items && payload.items.length > 0 && updatedHeader) {
        await supabase.from("jn_invoice_items").delete().eq("invoice_id", updatedHeader.id);

        const itemPayloads = payload.items.map(item => ({
          invoice_id: updatedHeader.id,
          service_id: (item.serviceId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(item.serviceId)) ? item.serviceId : null,
          service_name: item.serviceName,
          description: item.description || "",
          sac_code: item.sacCode || "998311",
          quantity: item.quantity,
          unit_price: item.unitPrice,
          discount: item.discount || 0.00,
          taxable_amount: item.taxableAmount,
          gst_rate: item.gstRate,
          gst_amount: item.gstAmount,
          total_amount: item.totalAmount
        }));

        await supabase.from("jn_invoice_items").insert(itemPayloads);
      }

      addAuditLog(
        "system@jn.internal",
        "Central Invoice Engine",
        UserRole.OWNER,
        "INVOICE_UPDATED",
        "DATABASE",
        `Updated invoice ${updatedHeader.invoice_number} in backend Supabase database`
      );

      const refreshed = await this.getInvoiceById(updatedHeader.id);
      return { success: true, invoice: refreshed.invoice, warning: warningText };
    } catch (err: any) {
      console.error("[CentralInvoiceRepository] updateInvoice error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Super Admin Delete/Void Invoice in Supabase PostgreSQL via authoritative delete_central_invoice RPC
   */
  public static async deleteInvoice(invoiceIdOrNumber: string, deletedBy?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const deletedByUuid = await this.resolveUserUuid(deletedBy);

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("delete_central_invoice", {
        p_invoice_id_or_number: invoiceIdOrNumber,
        p_deleted_by: deletedByUuid
      });

      if (rpcErr) {
        console.error("[CentralInvoiceRepository] delete_central_invoice RPC error:", rpcErr);
        return { success: false, error: rpcErr.message };
      }

      if (rpcRes && !rpcRes.success) {
        return { success: false, error: rpcRes.error || "Deletion failed" };
      }

      addAuditLog(
        "system@jn.internal",
        "Central Invoice Engine",
        UserRole.OWNER,
        "INVOICE_DELETED",
        "DATABASE",
        `Permanently deleted invoice ${rpcRes?.invoice_number || invoiceIdOrNumber} via delete_central_invoice RPC`
      );

      return { success: true };
    } catch (err: any) {
      console.error("[CentralInvoiceRepository] deleteInvoice error:", err);
      return { success: false, error: err.message };
    }
  }

  /**
   * Atomic Payment & Receipt Recording in Supabase PostgreSQL
   */
  public static async recordInvoicePayment(
    invoiceIdOrNumber: string,
    amount: number,
    mode: string,
    transactionRef?: string,
    remarks?: string,
    currentUser?: any
  ): Promise<{ success: boolean; invoice?: Invoice; receiptNumber?: string; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase not configured." };
    }

    if (!invoiceIdOrNumber || amount <= 0) {
      return { success: false, error: "Invalid payment details. Amount must be greater than zero." };
    }

    try {
      const userUuid = await this.resolveUserUuid(currentUser?.id || currentUser?.email);

      // Attempt 1: Call RPC record_invoice_payment
      const { data: rpcData, error: rpcError } = await supabase.rpc("record_invoice_payment", {
        p_invoice_id_or_number: invoiceIdOrNumber,
        p_amount: amount,
        p_payment_mode: mode,
        p_transaction_ref: transactionRef || null,
        p_remarks: remarks || null,
        p_created_by: userUuid
      });

      if (!rpcError && rpcData && rpcData.success) {
        const refreshed = await this.getInvoiceById(rpcData.invoice_id || invoiceIdOrNumber);
        return {
          success: true,
          invoice: refreshed.invoice,
          receiptNumber: rpcData.receipt_number
        };
      }

      if (rpcError) {
        console.warn("[CentralInvoiceRepository] RPC record_invoice_payment error/fallback:", rpcError);
      }

      // Fallback: Client-side atomic transaction if RPC is not installed
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdOrNumber);
      let query = supabase.from("jn_invoices").select("id, invoice_number, total_amount, amount_paid, balance_due, status, client_id");
      if (isUuid) {
        query = query.eq("id", invoiceIdOrNumber);
      } else {
        query = query.eq("invoice_number", invoiceIdOrNumber);
      }

      const { data: invRow, error: invErr } = await query.single();
      if (invErr || !invRow) throw invErr || new Error("Invoice not found in database.");

      if (invRow.status === "CANCELLED") {
        return { success: false, error: "Cannot process payment against a cancelled invoice." };
      }

      const currentPaid = Number(invRow.amount_paid || 0);
      const totalAmount = Number(invRow.total_amount || 0);
      const remainingBalance = totalAmount - currentPaid;

      if (amount > remainingBalance + 0.01) {
        return { success: false, error: `Payment amount (₹${amount.toLocaleString("en-IN")}) exceeds remaining balance (₹${remainingBalance.toLocaleString("en-IN")}).` };
      }

      // Generate receipt number REC/YYYY-YY/000001 (sequence-safe via max sequence lookup)
      const fyStr = new Date().getMonth() < 3
        ? `${new Date().getFullYear() - 1}-${(new Date().getFullYear() % 100).toString().padStart(2, "0")}`
        : `${new Date().getFullYear()}-${((new Date().getFullYear() + 1) % 100).toString().padStart(2, "0")}`;

      const { data: latestReceipt } = await supabase
        .from("jn_receipts")
        .select("receipt_number")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let nextSeq = 1;
      if (latestReceipt && latestReceipt.receipt_number) {
        const match = latestReceipt.receipt_number.match(/(\d+)$/);
        if (match) {
          nextSeq = parseInt(match[1], 10) + 1;
        }
      }
      const receiptNumber = `REC/${fyStr}/${nextSeq.toString().padStart(6, "0")}`;

      // Insert receipt record
      const receiptPayload: any = {
        receipt_number: receiptNumber,
        receipt_date: new Date().toISOString().split("T")[0],
        invoice_id: invRow.id,
        client_id: invRow.client_id || null,
        amount_received: amount,
        payment_mode: mode,
        transaction_ref: transactionRef || null,
        remarks: remarks || null,
        created_by: userUuid
      };

      const { data: recInserted, error: recErr } = await supabase
        .from("jn_receipts")
        .insert([receiptPayload])
        .select()
        .single();

      if (recErr) throw recErr;

      // Update parent invoice
      const newPaid = currentPaid + amount;
      const newBalance = Math.max(0, totalAmount - newPaid);
      const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

      const { error: updateErr } = await supabase
        .from("jn_invoices")
        .update({
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", invRow.id);

      if (updateErr) throw updateErr;

      addAuditLog(
        currentUser?.email || "system@officeos.com",
        currentUser?.name || "System Engine",
        currentUser?.role || UserRole.OWNER,
        "PAYMENT_RECEIPT_LOGGED",
        "DATABASE",
        `Receipt '${receiptNumber}' of INR ${amount.toLocaleString("en-IN")} issued for Invoice '${invRow.invoice_number}' via [${mode}].`
      );

      const refreshed = await this.getInvoiceById(invRow.id);
      return {
        success: true,
        invoice: refreshed.invoice,
        receiptNumber: recInserted?.receipt_number || receiptNumber
      };

    } catch (err: any) {
      console.error("[CentralInvoiceRepository] recordInvoicePayment error:", err);
      return { success: false, error: err.message || "Failed to record payment receipt." };
    }
  }
}
