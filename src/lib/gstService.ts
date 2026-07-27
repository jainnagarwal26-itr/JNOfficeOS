/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Indian GST Calculation Engine
 */

export interface GSTBreakdown {
  taxableAmount: number;
  gstRate: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalGstAmount: number;
  grandTotal: number;
}

export class GSTService {
  private HOME_STATE_CODE = "27"; // Maharashtra GST Code

  /**
   * Calculates CGST, SGST, IGST based on Client GSTIN & Firm State
   */
  calculateGST(taxableAmount: number, gstRate: number = 18.0, clientGstin?: string): GSTBreakdown {
    const totalGst = (taxableAmount * gstRate) / 100;
    let cgst = 0;
    let sgst = 0;
    let igst = 0;

    const clientStateCode = clientGstin ? clientGstin.substring(0, 2) : "27";

    if (clientStateCode === this.HOME_STATE_CODE) {
      // Intra-state supply: CGST (9%) + SGST (9%)
      cgst = totalGst / 2;
      sgst = totalGst / 2;
    } else {
      // Inter-state supply: IGST (18%)
      igst = totalGst;
    }

    return {
      taxableAmount: Math.round(taxableAmount * 100) / 100,
      gstRate,
      cgstAmount: Math.round(cgst * 100) / 100,
      sgstAmount: Math.round(sgst * 100) / 100,
      igstAmount: Math.round(igst * 100) / 100,
      totalGstAmount: Math.round(totalGst * 100) / 100,
      grandTotal: Math.round((taxableAmount + totalGst) * 100) / 100
    };
  }
}

export const gstService = new GSTService();
