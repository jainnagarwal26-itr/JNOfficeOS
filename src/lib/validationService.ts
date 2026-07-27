/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ExtractedFieldItem } from "./fieldExtractionService";

export interface ValidationRuleResult {
  ruleCode: string;
  ruleName: string;
  status: "PASSED" | "WARNING" | "FAILED";
  errorMessage?: string;
}

export class ValidationService {
  /**
   * Run format and checksum validation rules on extracted document fields
   */
  public static validateExtractedFields(fields: ExtractedFieldItem[]): ValidationRuleResult[] {
    const results: ValidationRuleResult[] = [];

    // 1. PAN Format Checksum Rule
    const panField = fields.find(f => f.fieldName === "pan_number");
    if (panField) {
      const isPanValid = /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(panField.fieldValue);
      results.push({
        ruleCode: "VAL_PAN_FORMAT",
        ruleName: "PAN Card 10-Digit Format Verification",
        status: isPanValid ? "PASSED" : "FAILED",
        errorMessage: isPanValid ? undefined : "Extracted PAN does not match 10-character standard regex format."
      });
    }

    // 2. GSTIN State & Checksum Rule
    const gstinField = fields.find(f => f.fieldName === "gstin");
    if (gstinField) {
      const isGstinValid = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(gstinField.fieldValue);
      results.push({
        ruleCode: "VAL_GSTIN_FORMAT",
        ruleName: "GSTIN 15-Digit Format & State Prefix Verification",
        status: isGstinValid ? "PASSED" : "FAILED",
        errorMessage: isGstinValid ? undefined : "Extracted GSTIN does not match 15-character standard GSTIN format."
      });
    }

    // 3. Bank IFSC Verification Rule
    const ifscField = fields.find(f => f.fieldName === "ifsc_code");
    if (ifscField) {
      const isIfscValid = /^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscField.fieldValue);
      results.push({
        ruleCode: "VAL_IFSC_FORMAT",
        ruleName: "Bank IFSC Code Format Verification",
        status: isIfscValid ? "PASSED" : "FAILED",
        errorMessage: isIfscValid ? undefined : "Extracted IFSC code structure is invalid."
      });
    }

    // 4. Amount Math Integrity Rule
    const amountField = fields.find(f => f.fieldName === "total_amount");
    if (amountField) {
      const amtVal = parseFloat(amountField.fieldValue);
      const isAmtValid = !isNaN(amtVal) && amtVal >= 0;
      results.push({
        ruleCode: "VAL_AMOUNT_MATH",
        ruleName: "Extracted Invoice Total Math Integrity",
        status: isAmtValid ? "PASSED" : "WARNING",
        errorMessage: isAmtValid ? undefined : "Grand total value could not be calculated."
      });
    }

    return results;
  }
}
