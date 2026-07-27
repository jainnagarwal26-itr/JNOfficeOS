/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Payment Receipt Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseReceipt } from "../types/receipt";

export class ReceiptRepository {

  async recordReceipt(receipt: EnterpriseReceipt): Promise<{ success: boolean; data?: EnterpriseReceipt; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        receipt_number: receipt.receiptNumber,
        receipt_date: receipt.receiptDate,
        invoice_id: receipt.invoiceId,
        client_id: receipt.clientId,
        amount_received: receipt.amountReceived,
        payment_mode: receipt.paymentMode,
        transaction_ref: receipt.transactionRef || null,
        bank_name: receipt.bankName || null,
        remarks: receipt.remarks || null
      };

      const { data, error } = await supabase
        .from("jn_receipts")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      // Update parent invoice amount_paid & balance_due
      const { data: inv } = await supabase
        .from("jn_invoices")
        .select("total_amount, amount_paid")
        .eq("id", receipt.invoiceId)
        .single();

      if (inv) {
        const newPaid = Number(inv.amount_paid || 0) + Number(receipt.amountReceived);
        const newBalance = Number(inv.total_amount || 0) - newPaid;
        const newStatus = newBalance <= 0 ? "PAID" : "PARTIALLY_PAID";

        await supabase
          .from("jn_invoices")
          .update({
            amount_paid: newPaid,
            balance_due: Math.max(0, newBalance),
            status: newStatus,
            updated_at: new Date().toISOString()
          })
          .eq("id", receipt.invoiceId);
      }

      return {
        success: true,
        data: {
          id: data.id,
          receiptNumber: data.receipt_number,
          receiptDate: data.receipt_date,
          invoiceId: data.invoice_id,
          clientId: data.client_id,
          amountReceived: data.amount_received,
          paymentMode: data.payment_mode,
          transactionRef: data.transaction_ref,
          bankName: data.bank_name,
          remarks: data.remarks,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[ReceiptRepository] recordReceipt error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const receiptRepository = new ReceiptRepository();
