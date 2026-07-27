/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 5: Finance & Invoice Types
 */

export type InvoiceStatus =
  | "DRAFT"
  | "UNPAID"
  | "PARTIALLY_PAID"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED"
  | "REFUNDED";

export interface EnterpriseInvoiceItem {
  id?: string;
  invoiceId?: string;
  serviceId?: string;
  serviceName: string;
  sacCode?: string;
  quantity: number;
  unitPrice: number;
  taxableAmount: number;
  gstRate: number; // 18%
  gstAmount: number;
  totalAmount: number;
}

export interface EnterpriseInvoice {
  id?: string;
  invoiceNumber: string; // e.g. JNA/2026-27/000001
  invoiceDate: string;
  dueDate: string;
  clientId: string;
  clientName: string;
  clientGstin?: string;
  clientAddress?: string;

  subTotal: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  gstAmount: number;
  totalAmount: number;
  amountPaid: number;
  balanceDue: number;

  status: InvoiceStatus;
  notes?: string;
  terms?: string;

  items?: EnterpriseInvoiceItem[];

  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}
