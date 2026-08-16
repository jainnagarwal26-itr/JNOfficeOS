import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseInvoice } from "../types/invoice";

/**
 * @deprecated RETIRED IN PHASE 3B: Use CentralInvoiceRepository from src/lib/centralInvoiceRepository.ts instead.
 * Do not use for new billing flows. Retained for historical build-reference only.
 */
export class InvoiceRepository {

  async fetchAllInvoices(statusFilter?: string): Promise<EnterpriseInvoice[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_invoices")
        .select(`
          *,
          items:jn_invoice_items(*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (statusFilter && statusFilter !== "ALL") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        invoiceNumber: row.invoice_number,
        invoiceDate: row.invoice_date,
        dueDate: row.due_date,
        clientId: row.client_id,
        clientName: row.client_name,
        clientGstin: row.client_gstin || "",
        clientAddress: row.client_address || "",
        subTotal: row.sub_total,
        cgstAmount: row.cgst_amount,
        sgstAmount: row.sgst_amount,
        igstAmount: row.igst_amount,
        gstAmount: row.gst_amount,
        totalAmount: row.total_amount,
        amountPaid: row.amount_paid,
        balanceDue: row.balance_due,
        status: row.status,
        notes: row.notes || "",
        terms: row.terms || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        items: (row.items || []).map((item: any) => ({
          id: item.id,
          invoiceId: item.invoice_id,
          serviceId: item.service_id,
          serviceName: item.service_name,
          sacCode: item.sac_code,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          taxableAmount: item.taxable_amount,
          gstRate: item.gst_rate,
          gstAmount: item.gst_amount,
          totalAmount: item.total_amount
        }))
      }));
    } catch (err) {
      console.error("[InvoiceRepository] fetchAllInvoices error:", err);
      return [];
    }
  }

  async saveInvoice(invoice: EnterpriseInvoice): Promise<{ success: boolean; data?: EnterpriseInvoice; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        invoice_number: invoice.invoiceNumber,
        invoice_date: invoice.invoiceDate,
        due_date: invoice.dueDate,
        client_id: invoice.clientId,
        client_name: invoice.clientName,
        client_gstin: invoice.clientGstin || null,
        client_address: invoice.clientAddress || null,
        sub_total: invoice.subTotal,
        cgst_amount: invoice.cgstAmount,
        sgst_amount: invoice.sgstAmount,
        igst_amount: invoice.igstAmount,
        gst_amount: invoice.gstAmount,
        total_amount: invoice.totalAmount,
        amount_paid: invoice.amountPaid,
        balance_due: invoice.balanceDue,
        status: invoice.status,
        notes: invoice.notes || null,
        terms: invoice.terms || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_invoices")
        .upsert(payload, { onConflict: "invoice_number" })
        .select()
        .single();

      if (error) throw error;

      // Save line items
      if (invoice.items && invoice.items.length > 0 && data) {
        const itemPayloads = invoice.items.map(item => ({
          invoice_id: data.id,
          service_id: item.serviceId || null,
          service_name: item.serviceName,
          sac_code: item.sacCode || "998311",
          quantity: item.quantity,
          unit_price: item.unitPrice,
          taxable_amount: item.taxableAmount,
          gst_rate: item.gstRate,
          gst_amount: item.gstAmount,
          total_amount: item.totalAmount
        }));
        await supabase.from("jn_invoice_items").upsert(itemPayloads);
      }

      return { success: true };
    } catch (err: any) {
      console.error("[InvoiceRepository] saveInvoice error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const invoiceRepository = new InvoiceRepository();
