/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { DocumentClassificationType } from "../types/ocr";

export interface ExtractedFieldItem {
  fieldName: string;
  fieldValue: string;
  normalizedValue?: string;
  fieldType: "text" | "number" | "date" | "currency" | "boolean";
  confidence: number; // 0 to 100
  pageNumber: number;
}

export class FieldExtractionService {
  /**
   * Extract key compliance fields automatically from document text
   */
  public static extractFields(text: string, docType: DocumentClassificationType): ExtractedFieldItem[] {
    const fields: ExtractedFieldItem[] = [];

    // 1. PAN Number Extraction
    const panMatch = text.match(/\b[A-Z]{5}[0-9]{4}[A-Z]\b/);
    if (panMatch) {
      fields.push({
        fieldName: "pan_number",
        fieldValue: panMatch[0],
        normalizedValue: panMatch[0].toUpperCase(),
        fieldType: "text",
        confidence: 99.0,
        pageNumber: 1
      });
    }

    // 2. GSTIN Extraction
    const gstinMatch = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/);
    if (gstinMatch) {
      fields.push({
        fieldName: "gstin",
        fieldValue: gstinMatch[0],
        normalizedValue: gstinMatch[0].toUpperCase(),
        fieldType: "text",
        confidence: 98.5,
        pageNumber: 1
      });
    }

    // 3. Aadhaar Number Extraction
    const aadhaarMatch = text.match(/\b[2-9]{1}[0-9]{3}\s[0-9]{4}\s[0-9]{4}\b/);
    if (aadhaarMatch) {
      fields.push({
        fieldName: "aadhaar_number",
        fieldValue: aadhaarMatch[0],
        normalizedValue: aadhaarMatch[0].replace(/\s/g, ""),
        fieldType: "text",
        confidence: 98.0,
        pageNumber: 1
      });
    }

    // 4. Invoice Number Extraction
    const invoiceNumMatch = text.match(/(?:INVOICE|BILL)\s*(?:NO|NUMBER|REF|#)[:.\s]*([A-Z0-9\/-]{3,20})/i);
    if (invoiceNumMatch && invoiceNumMatch[1]) {
      fields.push({
        fieldName: "invoice_number",
        fieldValue: invoiceNumMatch[1].trim(),
        normalizedValue: invoiceNumMatch[1].trim(),
        fieldType: "text",
        confidence: 95.0,
        pageNumber: 1
      });
    }

    // 5. Date Extraction
    const dateMatch = text.match(/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/);
    if (dateMatch) {
      fields.push({
        fieldName: "document_date",
        fieldValue: dateMatch[0],
        normalizedValue: dateMatch[0],
        fieldType: "date",
        confidence: 94.0,
        pageNumber: 1
      });
    }

    // 6. Bank IFSC Code Extraction
    const ifscMatch = text.match(/\b[A-Z]{4}0[A-Z0-9]{6}\b/);
    if (ifscMatch) {
      fields.push({
        fieldName: "ifsc_code",
        fieldValue: ifscMatch[0],
        normalizedValue: ifscMatch[0].toUpperCase(),
        fieldType: "text",
        confidence: 97.5,
        pageNumber: 1
      });
    }

    // 7. Bank Account Number Extraction
    const bankAccMatch = text.match(/(?:ACCOUNT|ACC|A\/C)\s*(?:NO|NUMBER)[:.\s]*(\d{9,18})/i);
    if (bankAccMatch && bankAccMatch[1]) {
      fields.push({
        fieldName: "bank_account_number",
        fieldValue: bankAccMatch[1],
        normalizedValue: bankAccMatch[1],
        fieldType: "number",
        confidence: 95.5,
        pageNumber: 1
      });
    }

    // 8. Total Amount / Grand Total Extraction
    const amountMatch = text.match(/(?:GRAND TOTAL|TOTAL AMOUNT|NET AMOUNT|AMOUNT PAID|TOTAL)[:.\s]*₹?\s*([\d,]+\.?\d{0,2})/i);
    if (amountMatch && amountMatch[1]) {
      const cleanAmt = amountMatch[1].replace(/,/g, "");
      fields.push({
        fieldName: "total_amount",
        fieldValue: cleanAmt,
        normalizedValue: cleanAmt,
        fieldType: "currency",
        confidence: 96.0,
        pageNumber: 1
      });
    }

    return fields;
  }
}
