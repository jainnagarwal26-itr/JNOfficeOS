/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 9: BI Dashboard Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { MonthlyFinancialSummary, CaseCategoryAnalytics } from "../types/analytics";

export class DashboardRepository {

  async fetchMonthlyFinancialSummary(): Promise<MonthlyFinancialSummary[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("mv_monthly_financial_analytics")
        .select("*")
        .order("month_year", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        monthYear: row.month_year,
        invoiceCount: Number(row.invoice_count || 0),
        taxableRevenue: Number(row.taxable_revenue || 0),
        totalGst: Number(row.total_gst || 0),
        grossRevenue: Number(row.gross_revenue || 0),
        totalCollected: Number(row.total_collected || 0)
      }));
    } catch (err) {
      console.error("[DashboardRepository] fetchMonthlyFinancialSummary error:", err);
      return [];
    }
  }

  async fetchCaseCategoryAnalytics(): Promise<CaseCategoryAnalytics[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("v_case_analytics")
        .select("*");

      if (error) throw error;

      return (data || []).map((row: any) => ({
        category: row.category,
        status: row.status,
        priority: row.priority,
        caseCount: Number(row.case_count || 0),
        avgEstimatedHours: Number(row.avg_estimated_hours || 0),
        avgActualHours: Number(row.avg_actual_hours || 0),
        totalFeeAmount: Number(row.total_fee_amount || 0)
      }));
    } catch (err) {
      console.error("[DashboardRepository] fetchCaseCategoryAnalytics error:", err);
      return [];
    }
  }
}

export const dashboardRepository = new DashboardRepository();
