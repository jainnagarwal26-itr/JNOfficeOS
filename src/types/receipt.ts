/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Receipt Types
 */

export type PaymentMode =
  | "Bank Transfer"
  | "UPI"
  | "Cheque"
  | "Cash"
  | "Credit Card"
  | "Net Banking";

export interface EnterpriseReceipt {
  id?: string;
  receiptNumber: string; // e.g. REC/2026-27/000001
  receiptDate: string;
  invoiceId: string;
  clientId: string;
  clientName?: string;
  amountReceived: number;
  paymentMode: PaymentMode;
  transactionRef?: string;
  bankName?: string;
  remarks?: string;
  createdAt?: string;
}
