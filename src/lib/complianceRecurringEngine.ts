/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ComplianceRegisterRecord, ComplianceStatus } from "../types/compliance";
import { ComplianceRepository } from "./complianceRepository";
import { getClients } from "./db";

export class ComplianceRecurringEngine {
  /**
   * Scans all clients, checks enabled compliances, and generates missing statutory filing records
   * for the current Financial Year (e.g., 2026-27).
   */
  public static generateRecurringCompliances(targetFY: string = "2026-27"): { generatedCount: number } {
    const clients = getClients();
    const catalog = ComplianceRepository.getMasterCatalog();
    const existingRecords = ComplianceRepository.getAllRecords();
    let generatedCount = 0;

    const ay = targetFY === "2026-27" ? "2027-28" : "2028-29";

    for (const client of clients) {
      if (client.status !== "Active") continue;

      for (const masterItem of catalog) {
        // Check if compliance is enabled for this client
        const isEnabled = ComplianceRepository.isComplianceEnabled(client.id, masterItem.code);
        if (!isEnabled) continue; // Skip disabled compliances

        // Determine periods based on frequency
        const periods: { period: string; dueDate: string }[] = [];

        if (masterItem.frequency === "MONTHLY") {
          // 12 Months: Apr 2026 to Mar 2027
          const months = [
            { name: "April 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 4, year: 2026 },
            { name: "May 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 5, year: 2026 },
            { name: "June 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 6, year: 2026 },
            { name: "July 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 7, year: 2026 },
            { name: "August 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 8, year: 2026 },
            { name: "September 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 9, year: 2026 },
            { name: "October 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 10, year: 2026 },
            { name: "November 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 11, year: 2026 },
            { name: "December 2026", dueDay: masterItem.defaultDueDay || 20, monthIdx: 12, year: 2026 },
            { name: "January 2027", dueDay: masterItem.defaultDueDay || 20, monthIdx: 1, year: 2027 },
            { name: "February 2027", dueDay: masterItem.defaultDueDay || 20, monthIdx: 2, year: 2027 },
            { name: "March 2027", dueDay: masterItem.defaultDueDay || 20, monthIdx: 3, year: 2027 }
          ];

          for (const m of months) {
            // Due date is in next month for monthly filings
            let dueYear = m.year;
            let dueMonth = m.monthIdx + 1;
            if (dueMonth > 12) {
              dueMonth = 1;
              dueYear += 1;
            }
            const dueStr = `${dueYear}-${dueMonth.toString().padStart(2, "0")}-${m.dueDay.toString().padStart(2, "0")}`;
            periods.push({ period: m.name, dueDate: dueStr });
          }
        } else if (masterItem.frequency === "QUARTERLY") {
          periods.push(
            { period: "Q1 (Apr-Jun 2026)", dueDate: `2026-07-${(masterItem.defaultDueDay || 31).toString().padStart(2, "0")}` },
            { period: "Q2 (Jul-Sep 2026)", dueDate: `2026-10-${(masterItem.defaultDueDay || 31).toString().padStart(2, "0")}` },
            { period: "Q3 (Oct-Dec 2026)", dueDate: `2027-01-${(masterItem.defaultDueDay || 31).toString().padStart(2, "0")}` },
            { period: "Q4 (Jan-Mar 2027)", dueDate: `2027-04-${(masterItem.defaultDueDay || 31).toString().padStart(2, "0")}` }
          );
        } else if (masterItem.frequency === "YEARLY") {
          periods.push({
            period: `Annual (FY ${targetFY})`,
            dueDate: `2026-07-${(masterItem.defaultDueDay || 31).toString().padStart(2, "0")}`
          });
        }

        // Generate missing records
        for (const p of periods) {
          const exists = existingRecords.some(r => 
            r.clientId === client.id && 
            r.complianceCode === masterItem.code && 
            r.fy === targetFY && 
            r.period === p.period
          );

          if (!exists) {
            const todayStr = new Date().toISOString().split("T")[0];
            const isOverdue = new Date(p.dueDate) < new Date(todayStr);

            const newRecord: ComplianceRegisterRecord = {
              id: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              recordId: `cr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
              clientId: client.id,
              complianceCode: masterItem.code,
              complianceName: masterItem.name,
              category: masterItem.category,
              fy: targetFY,
              ay,
              period: p.period,
              dueDate: p.dueDate,
              status: isOverdue ? "OVERDUE" : "NOT_STARTED",
              assignedStaffId: client.assignedStaff?.[0] || undefined,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            ComplianceRepository.saveRecord(newRecord, "AUTOMATIC_RECURRING_ENGINE");
            generatedCount++;
          }
        }
      }
    }

    return { generatedCount };
  }
}
