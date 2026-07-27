/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: High-Level Finance & Billing Service Engine
 */

import { EnterpriseInvoice, EnterpriseInvoiceItem } from "../types/invoice";
import { EnterpriseReceipt } from "../types/receipt";
import { EnterpriseExpense } from "../types/expense";
import { gstService } from "./gstService";
import { invoiceRepository } from "./invoiceRepository";
import { receiptRepository } from "./receiptRepository";
import { expenseRepository } from "./expenseRepository";
import { databaseFoundationService } from "./databaseFoundationService";

export class FinanceService {

  /**
   * Create an Enterprise Invoice with automatic GST breakdown and sequence number (JNA/2026-27/000001)
   */
  async createInvoice(invoiceData: Partial<EnterpriseInvoice>, items: EnterpriseInvoiceItem[]): Promise<{ success: boolean; data?: EnterpriseInvoice; error?: string }> {
    if (!invoiceData.clientId || !invoiceData.clientName) {
      return { success: false, error: "Client ID and Client Name are required." };
    }

    if (!items || items.length === 0) {
      return { success: false, error: "Invoice must contain at least one line item." };
    }

    // 1. Calculate Taxable Subtotal and GST
    let subTotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalGst = 0;

    const processedItems: EnterpriseInvoiceItem[] = items.map(item => {
      const taxable = item.quantity * item.unitPrice;
      const gst = gstService.calculateGST(taxable, item.gstRate || 18.0, invoiceData.clientGstin);

      subTotal += taxable;
      totalCgst += gst.cgstAmount;
      totalSgst += gst.sgstAmount;
      totalIgst += gst.igstAmount;
      totalGst += gst.totalGstAmount;

      return {
        ...item,
        taxableAmount: taxable,
        gstAmount: gst.totalGstAmount,
        totalAmount: gst.grandTotal
      };
    });

    const grandTotal = subTotal + totalGst;
    const invoiceNumber = invoiceData.invoiceNumber || await databaseFoundationService.getNextBusinessNumber("INVOICE");

    const newInvoice: EnterpriseInvoice = {
      invoiceNumber,
      invoiceDate: invoiceData.invoiceDate || new Date().toISOString().split("T")[0],
      dueDate: invoiceData.dueDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0],
      clientId: invoiceData.clientId,
      clientName: invoiceData.clientName,
      clientGstin: invoiceData.clientGstin || "",
      clientAddress: invoiceData.clientAddress || "",
      subTotal: Math.round(subTotal * 100) / 100,
      cgstAmount: Math.round(totalCgst * 100) / 100,
      sgstAmount: Math.round(totalSgst * 100) / 100,
      igstAmount: Math.round(totalIgst * 100) / 100,
      gstAmount: Math.round(totalGst * 100) / 100,
      totalAmount: Math.round(grandTotal * 100) / 100,
      amountPaid: 0,
      balanceDue: Math.round(grandTotal * 100) / 100,
      status: invoiceData.status || "UNPAID",
      notes: invoiceData.notes || "",
      terms: invoiceData.terms || "Payment due within 15 days of invoice date.",
      items: processedItems
    };

    const res = await invoiceRepository.saveInvoice(newInvoice);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    return { success: true, data: newInvoice };
  }

  /**
   * Record a Payment Receipt against an Invoice with automatic balance update (REC/2026-27/000001)
   */
  async recordReceipt(receiptData: Partial<EnterpriseReceipt>): Promise<{ success: boolean; data?: EnterpriseReceipt; error?: string }> {
    if (!receiptData.invoiceId || !receiptData.clientId || !receiptData.amountReceived) {
      return { success: false, error: "Invoice ID, Client ID, and Amount Received are required." };
    }

    const receiptNumber = receiptData.receiptNumber || await databaseFoundationService.getNextBusinessNumber("RECEIPT");

    const newReceipt: EnterpriseReceipt = {
      receiptNumber,
      receiptDate: receiptData.receiptDate || new Date().toISOString().split("T")[0],
      invoiceId: receiptData.invoiceId,
      clientId: receiptData.clientId,
      clientName: receiptData.clientName || "",
      amountReceived: receiptData.amountReceived,
      paymentMode: receiptData.paymentMode || "Bank Transfer",
      transactionRef: receiptData.transactionRef || "",
      bankName: receiptData.bankName || "",
      remarks: receiptData.remarks || ""
    };

    return await receiptRepository.recordReceipt(newReceipt);
  }

  /**
   * Record an Office Expense (EXP/2026-27/000001)
   */
  async recordExpense(expenseData: Partial<EnterpriseExpense>): Promise<{ success: boolean; data?: EnterpriseExpense; error?: string }> {
    if (!expenseData.category || !expenseData.paidTo || !expenseData.amount) {
      return { success: false, error: "Category, Paid To, and Amount are required." };
    }

    const expenseNumber = expenseData.expenseNumber || await databaseFoundationService.getNextBusinessNumber("EXPENSE");

    const newExpense: EnterpriseExpense = {
      expenseNumber,
      expenseDate: expenseData.expenseDate || new Date().toISOString().split("T")[0],
      category: expenseData.category,
      paidTo: expenseData.paidTo,
      amount: expenseData.amount,
      paymentMode: expenseData.paymentMode || "Bank Transfer",
      referenceNumber: expenseData.referenceNumber || "",
      remarks: expenseData.remarks || "",
      receiptUrl: expenseData.receiptUrl || ""
    };

    return await expenseRepository.recordExpense(newExpense);
  }
}

export const financeService = new FinanceService();
