/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module A: Staff Daily Work Report Repository
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { User } from "../types";

export interface StaffDailyReport {
  id: string;
  staffUserId: string;
  staffName?: string;
  staffUserNumber?: string;
  reportDate: string; // YYYY-MM-DD
  workSummary: string;
  completedWork?: string;
  pendingWork?: string;
  clientRelatedWork?: string;
  caseRelatedWork?: string;
  hoursWorked: number;
  priorityItems?: string;
  remarks?: string;
  status: "DRAFT" | "SUBMITTED" | "REVIEWED";
  submittedAt?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = "jn_officeos_staff_daily_reports";

export class StaffDailyReportRepository {
  private static reportsCache: StaffDailyReport[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    const stored = typeof window !== "undefined" && typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        this.reportsCache = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored daily reports", e);
        this.reportsCache = [];
      }
    } else {
      this.reportsCache = [];
    }
    this.isInitialized = true;
  }

  private static persist() {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.reportsCache));
    }
  }

  public static getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  public static getTodayReport(staffUserId: string): StaffDailyReport | null {
    this.init();
    const today = this.getTodayDateString();
    return this.reportsCache.find(r => r.staffUserId === staffUserId && r.reportDate === today) || null;
  }

  public static getStaffReports(staffUserId: string): StaffDailyReport[] {
    this.init();
    return this.reportsCache
      .filter(r => r.staffUserId === staffUserId)
      .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  public static getAllStaffReports(currentUser: User): StaffDailyReport[] {
    this.init();
    const isOwner = currentUser.role === "OWNER" || currentUser.role === "SUPERADMIN";
    if (!isOwner) {
      return this.getStaffReports(currentUser.id);
    }
    return [...this.reportsCache].sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime());
  }

  public static async saveReport(
    reportData: Partial<StaffDailyReport>,
    currentUser: User
  ): Promise<{ success: boolean; data?: StaffDailyReport; error?: string }> {
    this.init();

    if (!currentUser || !currentUser.id) {
      return { success: false, error: "Authentication required" };
    }

    const reportDate = reportData.reportDate || this.getTodayDateString();
    const staffUserId = currentUser.id;

    // Check existing report for today
    const existingIndex = this.reportsCache.findIndex(
      r => r.staffUserId === staffUserId && r.reportDate === reportDate
    );

    const now = new Date().toISOString();
    const isSubmitting = reportData.status === "SUBMITTED";

    let updatedReport: StaffDailyReport;

    if (existingIndex !== -1) {
      // Edit existing report
      const existing = this.reportsCache[existingIndex];
      updatedReport = {
        ...existing,
        workSummary: reportData.workSummary ?? existing.workSummary,
        completedWork: reportData.completedWork ?? existing.completedWork,
        pendingWork: reportData.pendingWork ?? existing.pendingWork,
        clientRelatedWork: reportData.clientRelatedWork ?? existing.clientRelatedWork,
        caseRelatedWork: reportData.caseRelatedWork ?? existing.caseRelatedWork,
        hoursWorked: reportData.hoursWorked !== undefined ? reportData.hoursWorked : existing.hoursWorked,
        priorityItems: reportData.priorityItems ?? existing.priorityItems,
        remarks: reportData.remarks ?? existing.remarks,
        status: reportData.status || existing.status,
        submittedAt: isSubmitting ? now : (existing.submittedAt || null),
        updatedAt: now,
        staffName: currentUser.fullName || currentUser.name,
        staffUserNumber: currentUser.user_number
      };
      this.reportsCache[existingIndex] = updatedReport;
    } else {
      // Create new report
      updatedReport = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        staffUserId: staffUserId,
        staffName: currentUser.fullName || currentUser.name,
        staffUserNumber: currentUser.user_number,
        reportDate: reportDate,
        workSummary: reportData.workSummary || "",
        completedWork: reportData.completedWork || "",
        pendingWork: reportData.pendingWork || "",
        clientRelatedWork: reportData.clientRelatedWork || "",
        caseRelatedWork: reportData.caseRelatedWork || "",
        hoursWorked: reportData.hoursWorked || 0,
        priorityItems: reportData.priorityItems || "",
        remarks: reportData.remarks || "",
        status: reportData.status || "DRAFT",
        submittedAt: isSubmitting ? now : undefined,
        createdAt: now,
        updatedAt: now
      };
      this.reportsCache.unshift(updatedReport);
    }

    this.persist();

    // Async Supabase Sync
    if (isSupabaseConfigured()) {
      try {
        const payload = {
          staff_user_id: updatedReport.staffUserId,
          report_date: updatedReport.reportDate,
          work_summary: updatedReport.workSummary,
          completed_work: updatedReport.completedWork || null,
          pending_work: updatedReport.pendingWork || null,
          client_related_work: updatedReport.clientRelatedWork || null,
          case_related_work: updatedReport.caseRelatedWork || null,
          hours_worked: updatedReport.hoursWorked,
          priority_items: updatedReport.priorityItems || null,
          remarks: updatedReport.remarks || null,
          status: updatedReport.status,
          submitted_at: updatedReport.submittedAt || null,
          updated_at: updatedReport.updatedAt
        };

        await supabase
          .from("jn_staff_daily_reports")
          .upsert(payload, { onConflict: "staff_user_id,report_date" });
      } catch (err) {
        console.warn("[StaffDailyReportRepository] Supabase sync warning:", err);
      }
    }

    return { success: true, data: updatedReport };
  }

  public static async reviewReport(
    reportId: string,
    reviewStatus: "REVIEWED",
    reviewerUser: User
  ): Promise<{ success: boolean; error?: string }> {
    this.init();
    const isOwner = reviewerUser.role === "OWNER" || reviewerUser.role === "SUPERADMIN";
    if (!isOwner) {
      return { success: false, error: "Permission denied: Only Owner/SuperAdmin can review reports." };
    }

    const report = this.reportsCache.find(r => r.id === reportId);
    if (report) {
      const now = new Date().toISOString();
      report.status = reviewStatus;
      report.reviewedBy = reviewerUser.id;
      report.reviewedAt = now;
      report.updatedAt = now;
      this.persist();

      if (isSupabaseConfigured()) {
        try {
          await supabase
            .from("jn_staff_daily_reports")
            .update({
              status: reviewStatus,
              reviewed_by: reviewerUser.id,
              reviewed_at: now,
              updated_at: now
            })
            .eq("id", reportId);
        } catch (e) {}
      }
      return { success: true };
    }
    return { success: false, error: "Report not found" };
  }
}
