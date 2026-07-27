/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Expense Types
 */

import { PaymentMode } from "./receipt";

export interface EnterpriseExpense {
  id?: string;
  expenseNumber: string; // e.g. EXP/2026-27/000001
  expenseDate: string;
  category: string; // Salaries, Rent, Utilities, Printing & Stationery, Software, Travel
  paidTo: string;
  amount: number;
  paymentMode: PaymentMode;
  referenceNumber?: string;
  remarks?: string;
  receiptUrl?: string;
  createdAt?: string;
}
