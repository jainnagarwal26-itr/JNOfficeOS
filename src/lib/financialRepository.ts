/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole, Client, Service, ActiveWorkflow } from "../types";
import { addAuditLog, getClients, getServices, getWorkflows } from "./db";
import { CaseRepository } from "./repository";
import { numberToWords } from "./numberToWords";

export interface InvoiceItem {
  id: string;
  serviceName: string;
  description: string;
  quantity: number;
  rate: number;
  discount: number; // Flat discount in INR
  taxableValue: number;
  gstRate: number; // percentage e.g. 18
  cgst: number;
  sgst: number;
  igst: number;
  cess: number;
  total: number;
}

export interface InvoiceReceipt {
  id: string; // Sequential REC/YYYY-YY/000001
  invoiceId: string;
  date: string;
  amount: number;
  mode: "Cash" | "UPI" | "NEFT" | "RTGS" | "Cheque" | "Card" | "Net Banking" | "Other";
  transactionRef?: string;
  remarks?: string;
  createdAt: string;
}

export interface Invoice {
  id: string; // JNA/YYYY-YY/000001
  type: "Tax Invoice" | "Bill of Supply" | "Proforma Invoice" | "Credit Note" | "Debit Note" | "Receipt Voucher" | "Payment Voucher";
  caseId: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  assignedStaffIds: string[];
  workflowId?: string;
  date: string; // YYYY-MM-DD
  dueDate: string; // YYYY-MM-DD
  subTotal: number;
  discountAmount: number;
  taxableAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  cessAmount: number;
  roundOff: number;
  grandTotal: number;
  amountInWords: string;
  status: "Unpaid" | "Partially Paid" | "Paid" | "Cancelled" | "Refunded";
  items: InvoiceItem[];
  payments: InvoiceReceipt[];
  createdAt: string;
  updatedAt: string;
  walkInAddress?: string;
  walkInMobile?: string;
  walkInGstin?: string;
}

export interface ClientLedgerEntry {
  id: string; // txn reference (invoice id or receipt id)
  date: string;
  type: "INVOICE" | "PAYMENT" | "CREDIT_NOTE" | "DEBIT_NOTE" | "REFUND";
  details: string;
  debit: number;  // invoice / debit note amounts increase what client owes
  credit: number; // payments / credit notes decrease what client owes
  runningBalance: number;
}

export interface ClientLedger {
  clientId: string;
  clientName: string;
  entries: ClientLedgerEntry[];
  totalBilled: number;
  totalPaid: number;
  outstandingBalance: number;
}

const STORAGE_KEYS = {
  INVOICES: "jn_officeos_financial_invoices",
  LAST_INVOICE_NUMBERS: "jn_officeos_last_invoice_numbers", // For FY resets
  LAST_RECEIPT_NUMBERS: "jn_officeos_last_receipt_numbers"
};

export class FinancialRepository {
  private static invoicesCache: Invoice[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    
    const stored = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (stored) {
      try {
        const parsed: Invoice[] = JSON.parse(stored);
        this.invoicesCache = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error("Failed to parse stored invoices", e);
        this.invoicesCache = [];
      }
    } else {
      this.invoicesCache = [];
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
    }
    this.isInitialized = true;
  }

  public static clearAllInvoices(): void {
    this.invoicesCache = [];
    localStorage.removeItem(STORAGE_KEYS.INVOICES);
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify([]));
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.invoicesCache));

    // Real-Time Enterprise Supabase RDBMS Sync
    import("./supabaseService").then(({ supabaseService }) => {
      this.invoicesCache.forEach(inv => {
        supabaseService.upsertInvoice(inv);
      });
    });
    // Production Sync to Google Sheets
    import("./googleSheetsService").then(({ googleSheetsService }) => {
      if (googleSheetsService.isActiveSyncEnabled()) {
        const mapped = this.invoicesCache.map((inv) => ({
          "Invoice ID": inv.id,
          "Invoice_ID": inv.id,
          "Invoice_No": inv.id,
          "Invoice Type": inv.type,
          "Case ID": inv.caseId || "",
          "Case_ID": inv.caseId || "",
          "Client ID": inv.clientId,
          "Client_ID": inv.clientId,
          "Client Name": inv.clientName,
          "Client_Name": inv.clientName,
          "Service Name": inv.serviceName,
          "Service_Name": inv.serviceName,
          "Date": inv.date,
          "Invoice_Date": inv.date,
          "Due Date": inv.dueDate,
          "Due_Date": inv.dueDate,
          "Sub Total": inv.subTotal,
          "Sub_Total": inv.subTotal,
          "Discount Amount": inv.discountAmount,
          "Discount": inv.discountAmount,
          "Taxable Amount": inv.taxableAmount,
          "Taxable_Amt": inv.taxableAmount,
          "CGST Amount": inv.cgstAmount,
          "CGST_Amt": inv.cgstAmount,
          "SGST Amount": inv.sgstAmount,
          "SGST_Amt": inv.sgstAmount,
          "IGST Amount": inv.igstAmount,
          "IGST_Amt": inv.igstAmount,
          "Grand Total": inv.grandTotal,
          "Total_Amt": inv.grandTotal,
          "Status": inv.status,
          "Balance_Due": inv.status === "Paid" ? 0 : inv.grandTotal,
          "Created At": inv.createdAt,
          "Updated At": inv.updatedAt,
          "Is_Demo": false
        }));
        googleSheetsService.bulkSync("Invoices", "Invoice ID", mapped);

        // Relational Sync of Payment Receipts to jn_receipts
        const allPayments: any[] = [];
        this.invoicesCache.forEach(inv => {
          (inv.payments || []).forEach(p => {
            allPayments.push({
              "Receipt Number": p.id,
              "Receipt_ID": p.id,
              "Receipt_No": p.id,
              "Receipt Date": p.date,
              "Receipt_Date": p.date,
              "Invoice Number": p.invoiceId,
              "Invoice_ID": p.invoiceId,
              "Client_ID": inv.clientId,
              "Client Name": inv.clientName,
              "Client_Name": inv.clientName,
              "Amount Received (INR)": p.amount,
              "Amount_Paid": p.amount,
              "Payment Mode": p.mode,
              "Payment_Method": p.mode,
              "Transaction Ref No": p.transactionRef || "",
              "Transaction_Ref": p.transactionRef || "",
              "Remarks": p.remarks || "",
              "Created At": p.createdAt,
              "Status": "Cleared",
              "Is_Demo": false
            });
          });
        });
        if (allPayments.length > 0) {
          googleSheetsService.bulkSync("Receipts", "Receipt Number", allPayments);
        }
      }
    });
  }

  // Fallback seeder to fetch any invoices existing in Case Management
  private static syncInvoicesFromCases() {
    try {
      const casesStr = localStorage.getItem("jn_officeos_cases");
      if (casesStr) {
        const cases = JSON.parse(casesStr);
        cases.forEach((c: any) => {
          if (c.invoice && !this.invoicesCache.some(i => i.id === c.invoice.id)) {
            // Map CaseInvoice back to standard Invoice structure
            const taxGst = c.invoice.gstAmount || 0;
            const subTotal = c.invoice.subTotal || 0;
            const total = c.invoice.totalAmount || 0;
            
            // Determine GST Split
            const state = "Maharashtra"; // default
            const isIntra = true;

            const mappedInvoice: Invoice = {
              id: c.invoice.id,
              type: "Tax Invoice",
              caseId: c.id,
              clientId: c.clientId,
              clientName: c.clientName,
              serviceId: c.serviceId,
              serviceName: c.serviceName,
              assignedStaffIds: c.assignedStaffIds || [],
              workflowId: c.workflowId,
              date: c.invoice.date || c.createdAt.split("T")[0],
              dueDate: c.invoice.dueDate || new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
              subTotal: subTotal,
              discountAmount: 0,
              taxableAmount: subTotal,
              cgstAmount: isIntra ? taxGst / 2 : 0,
              sgstAmount: isIntra ? taxGst / 2 : 0,
              igstAmount: !isIntra ? taxGst : 0,
              cessAmount: 0,
              roundOff: 0,
              grandTotal: total,
              amountInWords: numberToWords(total),
              status: c.invoice.status === "PAID" ? "Paid" : "Unpaid",
              items: [
                {
                  id: `item_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  serviceName: c.serviceName,
                  description: `Professional services for ${c.serviceName}`,
                  quantity: 1,
                  rate: subTotal,
                  discount: 0,
                  taxableValue: subTotal,
                  gstRate: c.invoice.gstRate || 18,
                  cgst: isIntra ? taxGst / 2 : 0,
                  sgst: isIntra ? taxGst / 2 : 0,
                  igst: !isIntra ? taxGst : 0,
                  cess: 0,
                  total: total
                }
              ],
              payments: (c.invoice.payments || []).map((p: any, idx: number) => ({
                id: p.id || `REC/2026-27/${(idx + 1).toString().padStart(6, "0")}`,
                invoiceId: c.invoice.id,
                date: p.date,
                amount: p.amount,
                mode: (p.mode || "UPI Transfer") as any,
                transactionRef: p.transactionRef,
                remarks: p.remarks,
                createdAt: p.date + "T10:00:00.000Z"
              })),
              createdAt: c.createdAt,
              updatedAt: c.updatedAt
            };
            this.invoicesCache.push(mappedInvoice);
          }
        });
        if (this.invoicesCache.length > 0) {
          this.persist();
        }
      }
    } catch (e) {
      console.error("Error syncing invoices from cases", e);
    }
  }

  // Calculate current Financial Year based on Invoice Date
  public static getFinancialYear(dateStr: string): string {
    const d = new Date(dateStr);
    const year = d.getFullYear();
    const month = d.getMonth(); // 0-11
    const startYear = month < 3 ? year - 1 : year; // FY starts April 1st
    const endYear = (startYear + 1) % 100;
    return `${startYear}-${endYear.toString().padStart(2, "0")}`;
  }

  // Sequence Number Generator
  public static generateNextInvoiceNumber(type: string, dateStr: string): string {
    this.init();
    const fy = this.getFinancialYear(dateStr);
    
    // Find all invoices for this FY
    const fyInvoices = this.invoicesCache.filter(inv => {
      return this.getFinancialYear(inv.date) === fy;
    });

    let maxNum = 0;
    fyInvoices.forEach(inv => {
      // Match format: JNA/YYYY-YY/XXXXXX
      const parts = inv.id.split("/");
      if (parts.length === 3) {
        const numPart = parseInt(parts[2], 10);
        if (!isNaN(numPart) && numPart > maxNum) {
          maxNum = numPart;
        }
      }
    });

    const nextNum = maxNum + 1;
    const padded = nextNum.toString().padStart(6, "0");
    return `JNA/${fy}/${padded}`;
  }

  // Sequence Number Generator for Receipts
  public static generateNextReceiptNumber(dateStr: string): string {
    this.init();
    const fy = this.getFinancialYear(dateStr);
    
    let maxNum = 0;
    this.invoicesCache.forEach(inv => {
      inv.payments.forEach(p => {
        const parts = p.id.split("/");
        if (parts.length === 3 && parts[0] === "REC") {
          const numPart = parseInt(parts[2], 10);
          if (!isNaN(numPart) && numPart > maxNum) {
            maxNum = numPart;
          }
        }
      });
    });

    const nextNum = maxNum + 1;
    const padded = nextNum.toString().padStart(6, "0");
    return `REC/${fy}/${padded}`;
  }

  public static async getInvoicesAsync(currentUser: User): Promise<Invoice[]> {
    this.init();
    try {
      const { supabaseService } = await import("./supabaseService");
      const res = await supabaseService.getInvoices();
      if (res.success && Array.isArray(res.data)) {
        this.invoicesCache = res.data;
        localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(this.invoicesCache));
      }
    } catch (e) {
      console.error("[FinancialRepository] Error fetching live invoices from Supabase", e);
    }
    return this.getInvoices(currentUser);
  }

  public static getInvoices(currentUser: User): Invoice[] {
    this.init();
    
    // For Owners, return all
    if (currentUser.role === UserRole.OWNER) {
      return this.invoicesCache;
    }

    // For Staff: check general view permission
    if (!currentUser.permissions.clientCrmView && !currentUser.permissions.invoiceView) {
      return [];
    }

    // Return invoices where staff is assigned or they have broad access
    return this.invoicesCache.filter(inv => {
      return inv.assignedStaffIds.includes(currentUser.id) || currentUser.permissions.invoiceView;
    });
  }

  public static deleteInvoice(id: string, currentUser: User): boolean {
    this.init();
    if (currentUser.role !== UserRole.OWNER && !currentUser.permissions.invoiceVoid) {
      throw new Error("Access Denied: You do not have permission to delete invoices.");
    }

    const index = this.invoicesCache.findIndex(inv => inv.id === id);
    if (index !== -1) {
      this.invoicesCache.splice(index, 1);
      this.persist();

      import("./supabaseService").then(({ supabaseService }) => {
        supabaseService.deleteInvoice(id);
      });
      return true;
    }
    return false;
  }

  public static getInvoiceById(id: string, currentUser: User): Invoice | null {
    this.init();
    const inv = this.invoicesCache.find(i => i.id === id);
    if (!inv) return null;

    if (currentUser.role !== UserRole.OWNER && !inv.assignedStaffIds.includes(currentUser.id) && !currentUser.permissions.invoiceView) {
      return null;
    }
    return inv;
  }

  public static createInvoice(
    invoiceData: Omit<Invoice, "id" | "createdAt" | "updatedAt" | "amountInWords" | "subTotal" | "taxableAmount" | "cgstAmount" | "sgstAmount" | "igstAmount" | "grandTotal" | "roundOff">,
    currentUser: User
  ): Invoice {
    this.init();

    if (currentUser.role !== UserRole.OWNER && !currentUser.permissions.invoiceCreate) {
      throw new Error("Access Denied: You do not have permission to create invoices.");
    }

    // Validate Case or Client Linkage
    if (!invoiceData.caseId && !invoiceData.clientId) {
      throw new Error("Validation Error: An invoice must be linked to a Case or a Client.");
    }

    // Generate Invoice ID
    const id = this.generateNextInvoiceNumber(invoiceData.type, invoiceData.date);

    // Calculate totals from items
    let subTotal = 0;
    let discountAmount = invoiceData.discountAmount || 0;
    let cgstSum = 0;
    let sgstSum = 0;
    let igstSum = 0;
    let cessSum = 0;

    const itemsWithTotals = invoiceData.items.map(item => {
      const taxableValue = parseFloat((item.quantity * item.rate - item.discount).toFixed(2));
      const cgst = parseFloat(item.cgst.toFixed(2));
      const sgst = parseFloat(item.sgst.toFixed(2));
      const igst = parseFloat(item.igst.toFixed(2));
      const cess = parseFloat((item.cess || 0).toFixed(2));
      const total = parseFloat((taxableValue + cgst + sgst + igst + cess).toFixed(2));

      subTotal += item.quantity * item.rate;
      cgstSum += cgst;
      sgstSum += sgst;
      igstSum += igst;
      cessSum += cess;

      return {
        ...item,
        taxableValue,
        total
      };
    });

    const taxableAmount = parseFloat((subTotal - discountAmount).toFixed(2));
    const rawGrandTotal = taxableAmount + cgstSum + sgstSum + igstSum + cessSum;
    const grandTotal = Math.round(rawGrandTotal);
    const roundOff = parseFloat((grandTotal - rawGrandTotal).toFixed(2));
    const amountInWords = numberToWords(grandTotal);

    const timestamp = new Date().toISOString();

    const newInvoice: Invoice = {
      ...invoiceData,
      id,
      subTotal: parseFloat(subTotal.toFixed(2)),
      discountAmount,
      taxableAmount,
      cgstAmount: parseFloat(cgstSum.toFixed(2)),
      sgstAmount: parseFloat(sgstSum.toFixed(2)),
      igstAmount: parseFloat(igstSum.toFixed(2)),
      cessAmount: parseFloat(cessSum.toFixed(2)),
      roundOff,
      grandTotal,
      amountInWords,
      items: itemsWithTotals,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Push to cache and persist
    this.invoicesCache.unshift(newInvoice);
    this.persist();

    // Sync back to Case
    this.syncInvoiceToCase(newInvoice, currentUser);

    // Add Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "INVOICE_GENERATED",
      "DATABASE",
      `Enterprise Invoice '${id}' (${invoiceData.type}) generated for Client '${invoiceData.clientName}' linked to Case '${invoiceData.caseId}' for INR ${grandTotal.toLocaleString("en-IN")}.`
    );

    return newInvoice;
  }

  public static updateInvoice(
    id: string,
    updates: Partial<Omit<Invoice, "id" | "createdAt" | "amountInWords" | "payments">>,
    currentUser: User
  ): Invoice {
    this.init();

    if (currentUser.role !== UserRole.OWNER && !currentUser.permissions.invoiceCreate) {
      throw new Error("Access Denied: You do not have permission to modify invoices.");
    }

    const index = this.invoicesCache.findIndex(inv => inv.id === id);
    if (index === -1) {
      throw new Error(`Invoice with Reference ${id} not found.`);
    }

    const existing = this.invoicesCache[index];
    const updatedInvoice = {
      ...existing,
      ...updates,
      updatedAt: new Date().toISOString()
    };

    // Recalculate if items were updated
    if (updates.items) {
      let subTotal = 0;
      let discountAmount = updatedInvoice.discountAmount || 0;
      let cgstSum = 0;
      let sgstSum = 0;
      let igstSum = 0;
      let cessSum = 0;

      updatedInvoice.items = updates.items.map(item => {
        const taxableValue = parseFloat((item.quantity * item.rate - item.discount).toFixed(2));
        const cgst = parseFloat(item.cgst.toFixed(2));
        const sgst = parseFloat(item.sgst.toFixed(2));
        const igst = parseFloat(item.igst.toFixed(2));
        const cess = parseFloat((item.cess || 0).toFixed(2));
        const total = parseFloat((taxableValue + cgst + sgst + igst + cess).toFixed(2));

        subTotal += item.quantity * item.rate;
        cgstSum += cgst;
        sgstSum += sgst;
        igstSum += igst;
        cessSum += cess;

        return {
          ...item,
          taxableValue,
          total
        };
      });

      updatedInvoice.subTotal = parseFloat(subTotal.toFixed(2));
      updatedInvoice.taxableAmount = parseFloat((subTotal - discountAmount).toFixed(2));
      updatedInvoice.cgstAmount = parseFloat(cgstSum.toFixed(2));
      updatedInvoice.sgstAmount = parseFloat(sgstSum.toFixed(2));
      updatedInvoice.igstAmount = parseFloat(igstSum.toFixed(2));
      updatedInvoice.cessAmount = parseFloat(cessSum.toFixed(2));

      const rawGrandTotal = updatedInvoice.taxableAmount + cgstSum + sgstSum + igstSum + cessSum;
      updatedInvoice.grandTotal = Math.round(rawGrandTotal);
      updatedInvoice.roundOff = parseFloat((updatedInvoice.grandTotal - rawGrandTotal).toFixed(2));
      updatedInvoice.amountInWords = numberToWords(updatedInvoice.grandTotal);
    }

    this.invoicesCache[index] = updatedInvoice;
    this.persist();

    // Sync to Case
    this.syncInvoiceToCase(updatedInvoice, currentUser);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "INVOICE_UPDATED",
      "DATABASE",
      `Invoice '${id}' was modified by ${currentUser.name}.`
    );

    return updatedInvoice;
  }

  public static cancelInvoice(id: string, currentUser: User): Invoice {
    this.init();

    if (currentUser.role !== UserRole.OWNER && !currentUser.permissions.invoiceVoid) {
      throw new Error("Access Denied: You do not have permission to cancel/void invoices.");
    }

    const index = this.invoicesCache.findIndex(inv => inv.id === id);
    if (index === -1) {
      throw new Error(`Invoice with Reference ${id} not found.`);
    }

    const existing = this.invoicesCache[index];
    existing.status = "Cancelled";
    existing.updatedAt = new Date().toISOString();
    
    // Void payments if any (cancelled invoice cannot have live payments)
    existing.payments = [];

    this.invoicesCache[index] = existing;
    this.persist();

    // Sync to Case
    this.syncInvoiceToCase(existing, currentUser);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "INVOICE_CANCELLED",
      "DATABASE",
      `Invoice '${id}' was marked as CANCELLED/VOID.`
    );

    return existing;
  }

  // Duplicate/Clone invoice
  public static duplicateInvoice(id: string, currentUser: User): Invoice {
    this.init();

    if (currentUser.role !== UserRole.OWNER && !currentUser.permissions.invoiceCreate) {
      throw new Error("Access Denied: You do not have permission to duplicate invoices.");
    }

    const existing = this.invoicesCache.find(inv => inv.id === id);
    if (!existing) {
      throw new Error("Invoice to clone not found.");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const newId = this.generateNextInvoiceNumber(existing.type, todayStr);

    const cloned: Invoice = {
      ...existing,
      id: newId,
      date: todayStr,
      dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0],
      status: "Unpaid",
      payments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.invoicesCache.unshift(cloned);
    this.persist();

    // Sync to Case
    this.syncInvoiceToCase(cloned, currentUser);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "INVOICE_DUPLICATED",
      "DATABASE",
      `Duplicated invoice '${id}' into new reference '${newId}' for Client '${existing.clientName}'.`
    );

    return cloned;
  }

  // Add Payment / Receipt
  public static addInvoicePayment(
    invoiceId: string,
    amount: number,
    mode: InvoiceReceipt["mode"],
    transactionRef?: string,
    remarks?: string,
    currentUser?: User
  ): Invoice {
    this.init();

    const idx = this.invoicesCache.findIndex(inv => inv.id === invoiceId);
    if (idx === -1) {
      throw new Error(`Invoice with ID ${invoiceId} not found.`);
    }

    const invoice = this.invoicesCache[idx];
    if (invoice.status === "Cancelled") {
      throw new Error("Cannot process payment against a cancelled/void invoice.");
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const receiptId = this.generateNextReceiptNumber(todayStr);

    const newPayment: InvoiceReceipt = {
      id: receiptId,
      invoiceId,
      date: todayStr,
      amount,
      mode,
      transactionRef,
      remarks,
      createdAt: new Date().toISOString()
    };

    invoice.payments.push(newPayment);

    // Compute status
    const totalPaid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
    if (totalPaid >= invoice.grandTotal) {
      invoice.status = "Paid";
    } else if (totalPaid > 0) {
      invoice.status = "Partially Paid";
    } else {
      invoice.status = "Unpaid";
    }

    invoice.updatedAt = new Date().toISOString();
    this.invoicesCache[idx] = invoice;
    this.persist();

    // Sync to Case
    this.syncInvoiceToCase(invoice, currentUser || { email: "system@officeos.com", name: "System Engine", role: UserRole.OWNER, id: "sys", permissions: {} as any, status: "ACTIVE", username: "system", mobile: "", designation: "", joiningDate: "", passwordHash: "", createdAt: "" });

    // Audit Log
    if (currentUser) {
      addAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "PAYMENT_RECEIPT_LOGGED",
        "DATABASE",
        `Receipt '${receiptId}' of INR ${amount.toLocaleString("en-IN")} issued for Invoice '${invoiceId}' via [${mode}].`
      );
    }

    return invoice;
  }

  // Helper to keep CaseRepository completely aligned
  private static syncInvoiceToCase(inv: Invoice, currentUser: User) {
    try {
      const casesStr = localStorage.getItem("jn_officeos_cases");
      if (casesStr) {
        const cases = JSON.parse(casesStr);
        const cIndex = cases.findIndex((c: any) => c.id === inv.caseId);
        if (cIndex !== -1) {
          const matchedCase = cases[cIndex];

          // Map back to CaseInvoice
          matchedCase.invoice = {
            id: inv.id,
            date: inv.date,
            dueDate: inv.dueDate,
            subTotal: inv.subTotal,
            gstRate: inv.items[0]?.gstRate || 18,
            gstAmount: inv.cgstAmount + inv.sgstAmount + inv.igstAmount,
            totalAmount: inv.grandTotal,
            status: inv.status === "Paid" ? "PAID" : "UNPAID",
            payments: inv.payments.map(p => ({
              id: p.id,
              date: p.date,
              amount: p.amount,
              mode: p.mode,
              transactionRef: p.transactionRef,
              remarks: p.remarks
            }))
          };

          // Also auto-mark case status to "Completed" if invoice is paid!
          if (inv.status === "Paid" && matchedCase.status !== "Completed") {
            matchedCase.status = "Completed";
            matchedCase.completedDate = new Date().toISOString().split("T")[0];
          }

          cases[cIndex] = matchedCase;
          localStorage.setItem("jn_officeos_cases", JSON.stringify(cases));
        }
      }
    } catch (e) {
      console.error("Failed to sync invoice back to case storage", e);
    }
  }

  // Compute Outstanding & Ledgers
  public static getLedgerByClient(clientId: string): ClientLedger {
    this.init();
    const clientInvoices = this.invoicesCache.filter(inv => inv.clientId === clientId);
    const client = getClients().find(c => c.id === clientId);
    const clientName = client ? client.name : "Acme Corporation";

    const entries: ClientLedgerEntry[] = [];
    let totalBilled = 0;
    let totalPaid = 0;

    // Process all transactions
    clientInvoices.forEach(inv => {
      if (inv.status === "Cancelled") {
        // Log cancelled invoice but net effect is zero
        entries.push({
          id: inv.id,
          date: inv.date,
          type: "INVOICE",
          details: `Tax Invoice [CANCELLED] - ${inv.serviceName}`,
          debit: 0,
          credit: 0,
          runningBalance: 0
        });
        return;
      }

      // Add invoice
      totalBilled += inv.grandTotal;
      entries.push({
        id: inv.id,
        date: inv.date,
        type: "INVOICE",
        details: `Raised Tax Invoice (${inv.type}) - ${inv.serviceName}`,
        debit: inv.grandTotal,
        credit: 0,
        runningBalance: 0
      });

      // Add payments
      inv.payments.forEach(p => {
        totalPaid += p.amount;
        entries.push({
          id: p.id,
          date: p.date,
          type: "PAYMENT",
          details: `Payment Received via [${p.mode}] ${p.transactionRef ? "Ref: " + p.transactionRef : ""}`,
          debit: 0,
          credit: p.amount,
          runningBalance: 0
        });
      });
    });

    // Sort entries chronologically
    entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate running balance
    let runningBalance = 0;
    const entriesWithBalance = entries.map(entry => {
      runningBalance += entry.debit - entry.credit;
      return {
        ...entry,
        runningBalance
      };
    });

    return {
      clientId,
      clientName,
      entries: entriesWithBalance,
      totalBilled,
      totalPaid,
      outstandingBalance: runningBalance
    };
  }

  // Calculate dynamic outstanding KPIs
  public static getOutstandingDetails(): {
    totalBilled: number;
    totalCollected: number;
    currentDue: number; // unpaid within terms
    overdue: number;    // unpaid beyond due date
    advance: number;    // negative balance (credit)
    balance: number;    // net outstanding
  } {
    this.init();
    
    let totalBilled = 0;
    let totalCollected = 0;
    let currentDue = 0;
    let overdue = 0;
    let advance = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    this.invoicesCache.forEach(inv => {
      if (inv.status === "Cancelled") return;

      totalBilled += inv.grandTotal;
      const invoicePaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      totalCollected += invoicePaid;

      const remaining = inv.grandTotal - invoicePaid;
      if (remaining > 0) {
        const dueDate = new Date(inv.dueDate);
        dueDate.setHours(0,0,0,0);

        if (dueDate < today) {
          overdue += remaining;
        } else {
          currentDue += remaining;
        }
      } else if (remaining < 0) {
        advance += Math.abs(remaining);
      }
    });

    return {
      totalBilled,
      totalCollected,
      currentDue,
      overdue,
      advance,
      balance: currentDue + overdue - advance
    };
  }

  // Payment Reminders Engine
  public static getReminders(): {
    invoiceId: string;
    clientName: string;
    amount: number;
    daysToDue: number;
    type: "7_DAYS_BEFORE" | "3_DAYS_BEFORE" | "DUE_TODAY" | "OVERDUE";
  }[] {
    this.init();
    const reminders: any[] = [];
    const today = new Date();
    today.setHours(0,0,0,0);

    this.invoicesCache.forEach(inv => {
      if (inv.status === "Paid" || inv.status === "Cancelled") return;

      const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
      const remaining = inv.grandTotal - paid;
      if (remaining <= 0) return;

      const dueDate = new Date(inv.dueDate);
      dueDate.setHours(0,0,0,0);

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 7) {
        reminders.push({
          invoiceId: inv.id,
          clientName: inv.clientName,
          amount: remaining,
          daysToDue: 7,
          type: "7_DAYS_BEFORE"
        });
      } else if (diffDays === 3) {
        reminders.push({
          invoiceId: inv.id,
          clientName: inv.clientName,
          amount: remaining,
          daysToDue: 3,
          type: "3_DAYS_BEFORE"
        });
      } else if (diffDays === 0) {
        reminders.push({
          invoiceId: inv.id,
          clientName: inv.clientName,
          amount: remaining,
          daysToDue: 0,
          type: "DUE_TODAY"
        });
      } else if (diffDays < 0) {
        reminders.push({
          invoiceId: inv.id,
          clientName: inv.clientName,
          amount: remaining,
          daysToDue: Math.abs(diffDays),
          type: "OVERDUE"
        });
      }
    });

    return reminders;
  }
}
