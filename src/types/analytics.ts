/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 9: Executive Analytics & BI Types
 */

export interface ExecutiveKPIs {
  totalClients: number;
  activeClients: number;
  totalCases: number;
  pendingCases: number;
  completedCases: number;
  totalRevenue: number;
  outstandingReceivables: number;
  totalCollections: number;
  totalExpenses: number;
  netProfit: number;
  totalDocuments: number;
  expiringDocuments: number;
}

export interface MonthlyFinancialSummary {
  monthYear: string;
  invoiceCount: number;
  taxableRevenue: number;
  totalGst: number;
  grossRevenue: number;
  totalCollected: number;
}

export interface CaseCategoryAnalytics {
  category: string;
  status: string;
  priority: string;
  caseCount: number;
  avgEstimatedHours: number;
  avgActualHours: number;
  totalFeeAmount: number;
}
