/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComplianceStatistics, ComplianceRiskAnalysis, ComplianceRegisterRecord } from "../types/compliance";
import { ComplianceRepository } from "./complianceRepository";
import { getClients, getUsers } from "./db";

export class ComplianceAnalyticsService {
  public static calculateStatistics(filterFY: string = "ALL", filterCategory: string = "ALL"): ComplianceStatistics {
    const clients = getClients();
    let records = ComplianceRepository.getAllRecords();

    if (filterFY !== "ALL") {
      records = records.filter(r => r.fy === filterFY);
    }
    if (filterCategory !== "ALL") {
      records = records.filter(r => r.category === filterCategory);
    }

    const todayStr = new Date().toISOString().split("T")[0];
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];

    const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"
    
    const nextMonthObj = new Date();
    nextMonthObj.setMonth(nextMonthObj.getMonth() + 1);
    const nextMonthPrefix = nextMonthObj.toISOString().split("T")[0].substring(0, 7);

    const totalClients = clients.length;
    const applicableClients = clients.filter(c => c.status === "Active").length;
    const totalRecords = records.length;

    const filedCount = records.filter(r => ["FILED", "VERIFIED", "COMPLETED"].includes(r.status)).length;
    const pendingCount = records.filter(r => ["NOT_STARTED", "IN_PROGRESS", "WAITING_CLIENT", "UNDER_REVIEW", "REOPENED"].includes(r.status)).length;
    const overdueCount = records.filter(r => r.status === "OVERDUE" || (!["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status) && r.dueDate < todayStr)).length;

    const dueTodayCount = records.filter(r => r.dueDate === todayStr && !["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status)).length;
    const dueThisWeekCount = records.filter(r => r.dueDate >= todayStr && r.dueDate <= next7DaysStr && !["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status)).length;
    const dueThisMonthCount = records.filter(r => r.dueDate.startsWith(currentMonthPrefix) && !["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status)).length;

    const completionPercentage = totalRecords > 0 ? Math.round((filedCount / totalRecords) * 100) : 100;
    
    // Risk Score: Higher overdue = higher risk (0 to 100)
    const riskScore = totalRecords > 0 ? Math.min(100, Math.round((overdueCount / totalRecords) * 100 * 2.5)) : 0;
    const firmHealthScore = Math.max(0, 100 - riskScore);

    return {
      totalClients,
      applicableClients,
      totalRecords,
      filedCount,
      pendingCount,
      overdueCount,
      dueTodayCount,
      dueThisWeekCount,
      dueThisMonthCount,
      completionPercentage,
      riskScore,
      firmHealthScore
    };
  }

  public static getRiskAnalysis(): ComplianceRiskAnalysis[] {
    const clients = getClients();
    const records = ComplianceRepository.getAllRecords();
    const todayStr = new Date().toISOString().split("T")[0];

    const list: ComplianceRiskAnalysis[] = [];

    for (const client of clients) {
      const clientRecords = records.filter(r => r.clientId === client.id);
      const overdue = clientRecords.filter(r => r.status === "OVERDUE" || (!["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status) && r.dueDate < todayStr)).length;

      if (overdue > 0) {
        let level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
        if (overdue >= 5) level = "CRITICAL";
        else if (overdue >= 3) level = "HIGH";
        else if (overdue >= 2) level = "MEDIUM";

        list.push({
          clientId: client.id,
          clientName: client.name,
          overdueCount: overdue,
          riskLevel: level,
          riskFactor: `${overdue} Statutory Compliance(s) Overdue`
        });
      }
    }

    return list.sort((a, b) => b.overdueCount - a.overdueCount);
  }

  public static getAISuggestions(): string[] {
    const stats = this.calculateStatistics();
    const risks = this.getRiskAnalysis();
    const suggestions: string[] = [];

    if (stats.overdueCount > 0) {
      suggestions.push(`⚠️ Critical Warning: ${stats.overdueCount} statutory returns are currently OVERDUE. Immediate partner intervention recommended.`);
    }

    if (risks.length > 0) {
      const topRisk = risks[0];
      suggestions.push(`🔥 High Risk Client: ${topRisk.clientName} has ${topRisk.overdueCount} overdue filings. Assign dedicated staff to clear bottleneck.`);
    }

    if (stats.dueThisWeekCount > 0) {
      suggestions.push(`📅 Deadline Notice: ${stats.dueThisWeekCount} compliance filings are due within the next 7 days.`);
    }

    if (stats.completionPercentage >= 80) {
      suggestions.push(`🎉 Excellence Status: Firm Compliance Completion Rate is at a healthy ${stats.completionPercentage}%.`);
    } else {
      suggestions.push(`💡 Workload Recommendation: Completion rate is ${stats.completionPercentage}%. Reallocate staff resources to accelerate filings.`);
    }

    return suggestions;
  }
}
