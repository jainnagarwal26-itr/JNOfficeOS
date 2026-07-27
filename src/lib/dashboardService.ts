/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 9: High-Level Executive Dashboard Coordinator Engine
 */

import { kpiService } from "./kpiService";
import { dashboardRepository } from "./dashboardRepository";
import { ExecutiveKPIs, MonthlyFinancialSummary, CaseCategoryAnalytics } from "../types/analytics";

export class DashboardService {

  async getExecutiveDashboardData(): Promise<{
    kpis: ExecutiveKPIs;
    financialSummary: MonthlyFinancialSummary[];
    caseAnalytics: CaseCategoryAnalytics[];
  }> {
    const kpis = await kpiService.fetchExecutiveKPIs();
    const financialSummary = await dashboardRepository.fetchMonthlyFinancialSummary();
    const caseAnalytics = await dashboardRepository.fetchCaseCategoryAnalytics();

    return {
      kpis,
      financialSummary,
      caseAnalytics
    };
  }
}

export const dashboardService = new DashboardService();
