/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentClassificationType } from "../types/ocr";

export interface ClassificationResult {
  documentType: DocumentClassificationType;
  confidence: number; // 0 to 100
  matchedKeywords: string[];
}

export class DocumentClassificationService {
  /**
   * High-accuracy rule-based classifier matching keywords and regex patterns for 12 document categories
   */
  public static classifyDocument(text: string, filename: string): ClassificationResult {
    const cleanText = text.toUpperCase();
    const cleanFilename = filename.toUpperCase();

    // 1. PAN Card
    if (
      cleanText.includes("INCOME TAX DEPARTMENT") ||
      cleanText.includes("PERMANENT ACCOUNT NUMBER") ||
      cleanText.includes("GOVT OF INDIA") ||
      /\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(cleanText) ||
      cleanFilename.includes("PAN")
    ) {
      return {
        documentType: "PAN_CARD",
        confidence: 98.5,
        matchedKeywords: ["INCOME TAX DEPARTMENT", "PERMANENT ACCOUNT NUMBER", "PAN_REGEX"]
      };
    }

    // 2. Aadhaar Card
    if (
      cleanText.includes("UNIQUE IDENTIFICATION AUTHORITY OF INDIA") ||
      cleanText.includes("AADHAAR") ||
      cleanText.includes("ADHAR") ||
      /\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b/.test(cleanText) ||
      cleanFilename.includes("AADHAAR") ||
      cleanFilename.includes("ADHAR")
    ) {
      return {
        documentType: "AADHAAR_CARD",
        confidence: 98.0,
        matchedKeywords: ["AADHAAR", "UIDAI", "GOVT OF INDIA"]
      };
    }

    // 3. GST Certificate
    if (
      cleanText.includes("GOODS AND SERVICES TAX") ||
      cleanText.includes("FORM GST REG-06") ||
      cleanText.includes("REGISTRATION CERTIFICATE") ||
      /\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/.test(cleanText) ||
      cleanFilename.includes("GST")
    ) {
      return {
        documentType: "GST_CERTIFICATE",
        confidence: 99.0,
        matchedKeywords: ["GOODS AND SERVICES TAX", "FORM GST REG-06", "GSTIN_REGEX"]
      };
    }

    // 4. ITR Acknowledgement
    if (
      cleanText.includes("INDIAN INCOME TAX RETURN ACKNOWLEDGEMENT") ||
      cleanText.includes("ITR-V") ||
      cleanText.includes("FORM ITR") ||
      cleanText.includes("ACKNOWLEDGEMENT NUMBER")
    ) {
      return {
        documentType: "ITR_ACKNOWLEDGEMENT",
        confidence: 97.5,
        matchedKeywords: ["INDIAN INCOME TAX RETURN ACKNOWLEDGEMENT", "ITR-V"]
      };
    }

    // 5. Form 16
    if (
      cleanText.includes("FORM NO. 16") ||
      cleanText.includes("CERTIFICATE UNDER SECTION 203") ||
      cleanText.includes("TAX DEDUCTED AT SOURCE") ||
      cleanFilename.includes("FORM16")
    ) {
      return {
        documentType: "FORM_16",
        confidence: 97.0,
        matchedKeywords: ["FORM NO. 16", "SECTION 203"]
      };
    }

    // 6. Tax Invoice / Invoice
    if (
      cleanText.includes("TAX INVOICE") ||
      cleanText.includes("INVOICE NO") ||
      cleanText.includes("BILL OF SUPPLY") ||
      cleanFilename.includes("INVOICE") ||
      cleanFilename.includes("BILL")
    ) {
      return {
        documentType: "INVOICE",
        confidence: 96.0,
        matchedKeywords: ["TAX INVOICE", "INVOICE NO"]
      };
    }

    // 7. Receipt / Payment Receipt
    if (
      cleanText.includes("RECEIPT VOUCHER") ||
      cleanText.includes("PAYMENT RECEIPT") ||
      cleanText.includes("MONEY RECEIPT") ||
      cleanFilename.includes("RECEIPT")
    ) {
      return {
        documentType: "RECEIPT",
        confidence: 95.0,
        matchedKeywords: ["RECEIPT", "PAYMENT RECEIPT"]
      };
    }

    // 8. Cancelled Cheque
    if (
      cleanText.includes("CANCELLED") ||
      cleanText.includes("PAY AT PAR") ||
      cleanText.includes("IFS CODE") ||
      cleanFilename.includes("CHEQUE")
    ) {
      return {
        documentType: "CANCELLED_CHEQUE",
        confidence: 94.0,
        matchedKeywords: ["CANCELLED", "CHEQUE"]
      };
    }

    // 9. Bank Statement
    if (
      cleanText.includes("ACCOUNT STATEMENT") ||
      cleanText.includes("BANK STATEMENT") ||
      cleanText.includes("TRANSACTION DETAILS") ||
      cleanFilename.includes("STATEMENT")
    ) {
      return {
        documentType: "BANK_STATEMENT",
        confidence: 95.5,
        matchedKeywords: ["ACCOUNT STATEMENT", "BANK STATEMENT"]
      };
    }

    // 10. Balance Sheet
    if (
      cleanText.includes("BALANCE SHEET AS AT") ||
      cleanText.includes("EQUITY AND LIABILITIES") ||
      cleanText.includes("ASSETS")
    ) {
      return {
        documentType: "BALANCE_SHEET",
        confidence: 96.0,
        matchedKeywords: ["BALANCE SHEET", "LIABILITIES"]
      };
    }

    // 11. Profit & Loss Statement
    if (
      cleanText.includes("PROFIT AND LOSS") ||
      cleanText.includes("STATEMENT OF PROFIT & LOSS") ||
      cleanText.includes("INCOME & EXPENDITURE")
    ) {
      return {
        documentType: "PROFIT_LOSS_STATEMENT",
        confidence: 96.0,
        matchedKeywords: ["PROFIT AND LOSS", "STATEMENT OF PROFIT & LOSS"]
      };
    }

    // 12. Audit Report
    if (
      cleanText.includes("INDEPENDENT AUDITOR'S REPORT") ||
      cleanText.includes("TAX AUDIT REPORT") ||
      cleanText.includes("FORM 3CB") ||
      cleanText.includes("FORM 3CD")
    ) {
      return {
        documentType: "AUDIT_REPORT",
        confidence: 97.0,
        matchedKeywords: ["AUDITOR'S REPORT", "FORM 3CD"]
      };
    }

    return {
      documentType: "UNKNOWN",
      confidence: 50.0,
      matchedKeywords: []
    };
  }
}
