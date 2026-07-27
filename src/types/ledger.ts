/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Client Ledger Types
 */

export interface ClientLedgerEntry {
  id?: string;
  clientId: string;
  transactionDate: string;
  voucherType: "INVOICE" | "RECEIPT" | "CREDIT_NOTE" | "DEBIT_NOTE" | "OPENING_BALANCE";
  voucherNumber: string;
  referenceId?: string;
  description: string;
  debitAmount: number;
  creditAmount: number;
  runningBalance: number;
  createdAt?: string;
}
