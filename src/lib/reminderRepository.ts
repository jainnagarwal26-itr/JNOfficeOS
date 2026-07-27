/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppReminder } from "../types";

const STORAGE_KEY = "jn_officeos_reminders";

export class ReminderRepository {
  private static remindersCache: AppReminder[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        this.remindersCache = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored reminders", e);
        this.remindersCache = [];
      }
    } else {
      // Seed some pending compliance and renewal reminders
      const now = new Date();
      const inThreeDays = new Date(now.getTime() + 1000 * 3600 * 24 * 3).toISOString().split("T")[0];
      const inSevenDays = new Date(now.getTime() + 1000 * 3600 * 24 * 7).toISOString().split("T")[0];
      const overdueDate = new Date(now.getTime() - 1000 * 3600 * 24 * 2).toISOString().split("T")[0];

      this.remindersCache = [
        {
          id: "rem_seed_1",
          title: "GST Filing GSTR-3B Submission",
          description: "Verify reconciliation reports for client Acme Tech Solutions before submitting portal filings.",
          category: "Compliance",
          dueDate: inThreeDays,
          status: "Pending",
          assignedToId: "usr_staff_001",
          createdAt: now.toISOString(),
          clientId: "CL000001",
          clientName: "Acme Tech Solutions Private Limited"
        },
        {
          id: "rem_seed_2",
          title: "DSC Signature Dongle Expiry",
          description: "Renew Digital Signature Certificate for director Dr. Khanna before ITR signing.",
          category: "Document Expiry",
          dueDate: inSevenDays,
          status: "Pending",
          createdAt: now.toISOString(),
          clientId: "CL000002",
          clientName: "Dr. Devendra Khanna"
        },
        {
          id: "rem_seed_3",
          title: "Follow-up on Outstanding Professional Fees",
          description: "Call Singhania Logistical Corp regarding unpaid Invoice JNA-2026-002.",
          category: "Payment Due",
          dueDate: overdueDate,
          status: "Overdue",
          assignedToId: "usr_staff_001",
          createdAt: new Date(now.getTime() - 1000 * 3600 * 24 * 5).toISOString(),
          clientId: "CL000003",
          clientName: "Singhania Logistical Corp"
        }
      ];
      this.persist();
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.remindersCache));
  }

  public static getReminders(): AppReminder[] {
    this.init();
    
    // Auto-update status to Overdue if target date has passed
    const todayStr = new Date().toISOString().split("T")[0];
    let changed = false;

    this.remindersCache = this.remindersCache.map(rem => {
      if (rem.status === "Pending" && rem.dueDate < todayStr) {
        changed = true;
        return { ...rem, status: "Overdue" };
      }
      return rem;
    });

    if (changed) {
      this.persist();
    }

    return [...this.remindersCache].sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }

  public static addReminder(
    reminder: Omit<AppReminder, "id" | "createdAt" | "status">
  ): AppReminder {
    this.init();
    const todayStr = new Date().toISOString().split("T")[0];
    const initialStatus = reminder.dueDate < todayStr ? "Overdue" : "Pending";

    const newReminder: AppReminder = {
      ...reminder,
      id: `rem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      status: initialStatus,
      createdAt: new Date().toISOString()
    };

    this.remindersCache.push(newReminder);
    this.persist();
    return newReminder;
  }

  public static completeReminder(id: string): void {
    this.init();
    const idx = this.remindersCache.findIndex(r => r.id === id);
    if (idx !== -1) {
      this.remindersCache[idx].status = "Completed";
      this.remindersCache[idx].completedAt = new Date().toISOString();
      this.persist();
    }
  }

  public static deleteReminder(id: string): void {
    this.init();
    this.remindersCache = this.remindersCache.filter(r => r.id !== id);
    this.persist();
  }

  // Google Sheets integration meta-schema
  public static getSheetsSchema() {
    return {
      sheetName: "System_Reminders",
      columns: [
        { name: "id", type: "string" },
        { name: "title", type: "string" },
        { name: "description", type: "string" },
        { name: "category", type: "string" },
        { name: "dueDate", type: "string" },
        { name: "status", type: "string" },
        { name: "assignedToId", type: "string" },
        { name: "createdAt", type: "string" },
        { name: "completedAt", type: "string" },
        { name: "clientId", type: "string" },
        { name: "clientName", type: "string" },
        { name: "caseId", type: "string" }
      ]
    };
  }
}
