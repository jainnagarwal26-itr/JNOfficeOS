/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 9: Executive KPI Calculation Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { ExecutiveKPIs } from "../types/analytics";

export class KPIService {

  async fetchExecutiveKPIs(): Promise<ExecutiveKPIs> {
    if (!isSupabaseConfigured()) {
      return {
        totalClients: 120,
        activeClients: 115,
        totalCases: 450,
        pendingCases: 35,
        completedCases: 415,
        totalRevenue: 2850000,
        outstandingReceivables: 320000,
        totalCollections: 2530000,
        totalExpenses: 840000,
        netProfit: 2010000,
        totalDocuments: 890,
        expiringDocuments: 4
      };
    }

    try {
      const { data, error } = await supabase
        .from("v_executive_dashboard")
        .select("*")
        .single();

      if (error || !data) throw error;

      const grossRev = Number(data.total_revenue || 0);
      const totalExp = Number(data.total_expenses || 0);

      return {
        totalClients: Number(data.total_clients || 0),
        activeClients: Number(data.active_clients || 0),
        totalCases: Number(data.total_cases || 0),
        pendingCases: Number(data.pending_cases || 0),
        completedCases: Number(data.completed_cases || 0),
        totalRevenue: grossRev,
        outstandingReceivables: Number(data.total_outstanding_receivables || 0),
        totalCollections: Number(data.total_collections || 0),
        totalExpenses: totalExp,
        netProfit: grossRev - totalExp,
        totalDocuments: Number(data.total_documents || 0),
        expiringDocuments: Number(data.expiring_documents || 0)
      };
    } catch (err) {
      console.error("[KPIService] fetchExecutiveKPIs error:", err);
      return {
        totalClients: 0,
        activeClients: 0,
        totalCases: 0,
        pendingCases: 0,
        completedCases: 0,
        totalRevenue: 0,
        outstandingReceivables: 0,
        totalCollections: 0,
        totalExpenses: 0,
        netProfit: 0,
        totalDocuments: 0,
        expiringDocuments: 0
      };
    }
  }
}

export const kpiService = new KPIService();
