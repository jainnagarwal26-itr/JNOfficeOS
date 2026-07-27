/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, DocumentType, Client, Case } from "../types";
import { getClients, getSettings } from "./db";
import { CaseRepository } from "./repository";
import { FinancialRepository, Invoice } from "./financialRepository";
import { eventBus } from "./eventBus";

export interface DocumentPayload {
  documentType: DocumentType;
  title: string;
  documentNumber: string;
  date: string;
  dueDate?: string;
  
  // Sender info (Firm settings)
  senderName: string;
  senderTagline: string;
  senderAddress: string;
  senderContact: string;
  senderEmail: string;
  senderPan: string;
  senderGstin: string;
  senderBankDetails: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
    branchName: string;
    accountHolderName: string;
    upiId: string;
  };

  // Client / Recipient Info
  recipientName: string;
  recipientAddress: string;
  recipientContact: string;
  recipientEmail: string;
  recipientGstin?: string;
  recipientPan?: string;

  // Items / Columns
  columns: { key: string; label: string; align?: "left" | "right" | "center" }[];
  items: any[];
  
  // Financial Summary
  subTotal?: number;
  discount?: number;
  taxableValue?: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  grandTotal?: number;
  amountInWords?: string;
  outstandingBalance?: number;

  // Metadata
  terms: string[];
  declaration: string;
  signatureText: string;
  qrCodeUrl: string;
  watermarkText: string;
  generatedBy: string;
  generatedAt: string;
}

export class PdfRepository {
  public static generateDocumentData(
    documentType: DocumentType,
    targetId: string, // invoice id, case id, client id, etc.
    currentUser: User,
    watermarkText: string = ""
  ): DocumentPayload {
    const settings = getSettings();
    const clients = getClients();
    const cases = CaseRepository.getCases(currentUser);
    const invoices = FinancialRepository.getInvoices(currentUser);

    // Default basic structure
    const payload: DocumentPayload = {
      documentType,
      title: documentType.replace(/_/g, " "),
      documentNumber: targetId || "TEMP-001",
      date: new Date().toISOString().split("T")[0],
      senderName: settings.firmName,
      senderTagline: settings.tagline,
      senderAddress: settings.address,
      senderContact: settings.phone,
      senderEmail: settings.email,
      senderPan: "AAAJF9082F", // Default firm PAN
      senderGstin: "27AAAJF9082F1ZK", // Default Maharashtra GSTIN
      senderBankDetails: settings.bankDetails,
      recipientName: "Valued Client",
      recipientAddress: "Not Provided",
      recipientContact: "Not Provided",
      recipientEmail: "Not Provided",
      columns: [],
      items: [],
      terms: settings.termsAndConditions,
      declaration: settings.declaration,
      signatureText: "For JAIN AGARWAL AND CO\n\n\n\nAuthorized Signatory",
      qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${encodeURIComponent(settings.bankDetails.upiId)}%26pn=${encodeURIComponent(settings.firmName)}%26cu=INR`,
      watermarkText,
      generatedBy: currentUser.name,
      generatedAt: new Date().toISOString()
    };

    switch (documentType) {
      case "TAX_INVOICE":
      case "PROFORMA_INVOICE":
      case "CREDIT_NOTE":
      case "DEBIT_NOTE": {
        const inv = invoices.find(i => i.id === targetId) || invoices[0];
        if (inv) {
          const client = clients.find(c => c.id === inv.clientId);
          
          payload.title = documentType === "TAX_INVOICE" ? "TAX INVOICE" : documentType.replace(/_/g, " ");
          payload.documentNumber = inv.id;
          payload.date = inv.date;
          payload.dueDate = inv.dueDate;
          
          payload.recipientName = inv.clientName;
          payload.recipientAddress = client ? `${client.officeAddress}, ${client.city}, ${client.state} - ${client.pinCode}` : "Not Available";
          payload.recipientContact = client ? client.mobile : "N/A";
          payload.recipientEmail = client ? client.email : "N/A";
          payload.recipientGstin = client?.gstin || "N/A";
          payload.recipientPan = client?.pan || "N/A";

          payload.columns = [
            { key: "srNo", label: "S.No", align: "center" },
            { key: "serviceName", label: "Service / Description", align: "left" },
            { key: "rate", label: "Rate (INR)", align: "right" },
            { key: "quantity", label: "Qty", align: "center" },
            { key: "taxableValue", label: "Taxable Value", align: "right" },
            { key: "gstRate", label: "GST %", align: "center" },
            { key: "total", label: "Amount (INR)", align: "right" }
          ];

          payload.items = inv.items.map((it, index) => ({
            srNo: index + 1,
            serviceName: `${it.serviceName}\n${it.description}`,
            rate: it.rate.toLocaleString("en-IN"),
            quantity: it.quantity,
            taxableValue: it.taxableValue.toLocaleString("en-IN"),
            gstRate: `${it.gstRate}%`,
            total: it.total.toLocaleString("en-IN")
          }));

          payload.subTotal = inv.subTotal;
          payload.discount = inv.discountAmount;
          payload.taxableValue = inv.taxableAmount;
          payload.cgst = inv.cgstAmount;
          payload.sgst = inv.sgstAmount;
          payload.igst = inv.igstAmount;
          payload.grandTotal = inv.grandTotal;
          payload.amountInWords = inv.amountInWords;
          
          // Custom UPI dynamic payment link containing invoice balance and serial number
          payload.qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=${encodeURIComponent(settings.bankDetails.upiId)}%26pn=${encodeURIComponent(settings.firmName)}%26am=${inv.grandTotal}%26tn=${encodeURIComponent(inv.id)}%26cu=INR`;
        }
        break;
      }

      case "RECEIPT": {
        // Collect invoice and matching payment reference
        let foundPayment: any = null;
        let matchedInvoice: any = null;

        invoices.forEach(inv => {
          const match = inv.payments.find(p => p.id === targetId);
          if (match) {
            foundPayment = match;
            matchedInvoice = inv;
          }
        });

        if (!foundPayment && invoices.length > 0 && invoices[0].payments.length > 0) {
          foundPayment = invoices[0].payments[0];
          matchedInvoice = invoices[0];
        }

        if (foundPayment && matchedInvoice) {
          const client = clients.find(c => c.id === matchedInvoice.clientId);

          payload.title = "RECEIPT VOUCHER";
          payload.documentNumber = foundPayment.id;
          payload.date = foundPayment.date;
          
          payload.recipientName = matchedInvoice.clientName;
          payload.recipientAddress = client ? `${client.officeAddress}, ${client.city}, ${client.state} - ${client.pinCode}` : "Not Available";
          payload.recipientContact = client ? client.mobile : "N/A";
          payload.recipientEmail = client ? client.email : "N/A";

          payload.columns = [
            { key: "invoiceId", label: "Invoice Reference", align: "left" },
            { key: "service", label: "Service Mode Rendered", align: "left" },
            { key: "mode", label: "Payment Mode", align: "center" },
            { key: "refNo", label: "Txn Ref No", align: "left" },
            { key: "amount", label: "Amount Paid (INR)", align: "right" }
          ];

          payload.items = [{
            invoiceId: foundPayment.invoiceId,
            service: matchedInvoice.serviceName,
            mode: foundPayment.mode,
            refNo: foundPayment.transactionRef || "N/A",
            amount: foundPayment.amount.toLocaleString("en-IN")
          }];

          payload.grandTotal = foundPayment.amount;
          payload.amountInWords = `${foundPayment.amount.toLocaleString("en-IN")} Indian Rupees Only`;
        }
        break;
      }

      case "CLIENT_STATEMENT":
      case "OUTSTANDING_STATEMENT": {
        const client = clients.find(c => c.id === targetId) || clients[0];
        if (client) {
          payload.title = documentType === "CLIENT_STATEMENT" ? "STATEMENT OF ACCOUNTS" : "OUTSTANDING BALANCE DEMAND";
          payload.documentNumber = `SOA/${new Date().getFullYear()}/${client.id}`;
          
          payload.recipientName = client.name;
          payload.recipientAddress = `${client.officeAddress}, ${client.city}, ${client.state} - ${client.pinCode}`;
          payload.recipientContact = client.mobile;
          payload.recipientEmail = client.email;
          payload.recipientGstin = client.gstin || "N/A";

          // Calculate Ledger entries
          const clientInvoices = invoices.filter(inv => inv.clientId === client.id && inv.status !== "Cancelled");
          const entries: any[] = [];

          clientInvoices.forEach(inv => {
            entries.push({
              date: inv.date,
              ref: inv.id,
              type: "Invoice Raised",
              debit: inv.grandTotal,
              credit: 0
            });

            inv.payments.forEach(p => {
              entries.push({
                date: p.date,
                ref: p.id,
                type: `Payment Received (${p.mode})`,
                debit: 0,
                credit: p.amount
              });
            });
          });

          // Sort chronological
          entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

          let running = 0;
          const mappedItems = entries.map((entry, idx) => {
            running += entry.debit - entry.credit;
            return {
              srNo: idx + 1,
              date: entry.date,
              ref: entry.ref,
              type: entry.type,
              debit: entry.debit > 0 ? entry.debit.toLocaleString("en-IN") : "-",
              credit: entry.credit > 0 ? entry.credit.toLocaleString("en-IN") : "-",
              running: running.toLocaleString("en-IN")
            };
          });

          payload.columns = [
            { key: "srNo", label: "S.No", align: "center" },
            { key: "date", label: "Date", align: "center" },
            { key: "ref", label: "Reference", align: "left" },
            { key: "type", label: "Particulars / Description", align: "left" },
            { key: "debit", label: "Charges (Dr)", align: "right" },
            { key: "credit", label: "Receipts (Cr)", align: "right" },
            { key: "running", label: "Balance (Dr)", align: "right" }
          ];

          payload.items = mappedItems;
          const totalDr = entries.reduce((acc, curr) => acc + curr.debit, 0);
          const totalCr = entries.reduce((acc, curr) => acc + curr.credit, 0);
          
          payload.subTotal = totalDr;
          payload.discount = totalCr;
          payload.grandTotal = totalDr - totalCr;
          payload.amountInWords = `${payload.grandTotal.toLocaleString("en-IN")} Indian Rupees Outstanding`;
        }
        break;
      }

      case "QUOTATION":
      case "ESTIMATE": {
        // Standard Estimate template with predefined CA services
        payload.title = documentType === "QUOTATION" ? "PROFESSIONAL FEE QUOTATION" : "COST ESTIMATE STATEMENT";
        payload.documentNumber = `EST/${new Date().getFullYear()}/00281`;
        
        payload.recipientName = "Aspirant Enterprise Inc.";
        payload.recipientAddress = "402 Corporate Park, Bandra Kurla Complex, Mumbai";
        payload.recipientContact = "+91 9833445566";
        payload.recipientEmail = "finances@aspirant.in";

        payload.columns = [
          { key: "sr", label: "S.No", align: "center" },
          { key: "service", label: "Scope of Advisory / Compliance Services", align: "left" },
          { key: "fees", label: "Professional Fees (INR)", align: "right" },
          { key: "gst", label: "Applicable GST", align: "center" },
          { key: "total", label: "Gross Estimate (INR)", align: "right" }
        ];

        payload.items = [
          {
            sr: 1,
            service: "Statutory Audit & Tax Representation Services (Annual Contract)",
            fees: "45,000",
            gst: "18% GST",
            total: "53,100"
          },
          {
            sr: 2,
            service: "GST Filing & Quarterly GSTR-2B Reconciliation (FY 2026-27)",
            fees: "18,000",
            gst: "18% GST",
            total: "21,240"
          }
        ];

        payload.subTotal = 63000;
        payload.taxableValue = 63000;
        payload.cgst = 5670;
        payload.sgst = 5670;
        payload.grandTotal = 74340;
        payload.amountInWords = "Seventy-Four Thousand Three Hundred Forty Indian Rupees Only";
        break;
      }

      case "CASE_SUMMARY": {
        const cs = cases.find(c => c.id === targetId) || cases[0];
        if (cs) {
          payload.title = "CASE STATUS DOSSIER";
          payload.documentNumber = cs.id;
          payload.date = cs.createdAt.split("T")[0];

          payload.recipientName = cs.clientName;
          payload.recipientEmail = "N/A";
          payload.recipientContact = "N/A";

          payload.columns = [
            { key: "item", label: "Process Milestone / Checklist Item", align: "left" },
            { key: "status", label: "Fulfillment Status", align: "center" },
            { key: "by", label: "Validated By", align: "left" },
            { key: "date", label: "Verification Date", align: "center" }
          ];

          payload.items = cs.checklist.map(item => ({
            item: item.title,
            status: item.isCompleted ? "VERIFIED" : "PENDING",
            by: item.completedBy || "-",
            date: item.completedAt ? item.completedAt.split("T")[0] : "-"
          }));

          payload.declaration = `Audit Trail: This docket compiles the active checklist status of Case ${cs.id} (${cs.serviceName}). All records are digitally logs in JN OfficeOS.`;
        }
        break;
      }

      default: {
        payload.title = `${documentType.replace(/_/g, " ")}`;
        payload.columns = [{ key: "info", label: "Information Details" }];
        payload.items = [{ info: "Document type layout compiled successfully." }];
      }
    }

    // Publish event on Event Bus
    eventBus.publish(
      "PDF_GENERATED",
      "PDF & Document Engine",
      {
        documentType,
        documentNumber: payload.documentNumber,
        recipient: payload.recipientName
      },
      currentUser.email,
      currentUser.name
    );

    return payload;
  }

  public static triggerExportEvent(format: "PDF" | "Excel" | "CSV" | "JSON", name: string, currentUser: User) {
    eventBus.publish(
      "EXPORT_COMPLETED",
      "Data Export Engine",
      {
        format,
        exportName: name,
        timestamp: new Date().toISOString()
      },
      currentUser.email,
      currentUser.name
    );
  }
}
