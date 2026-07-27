/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReportTemplate, ReportType, ReportColumn, ScheduledReport } from "../types";

const TEMPLATE_STORAGE_KEY = "jn_officeos_report_templates";
const SCHEDULER_STORAGE_KEY = "jn_officeos_scheduled_reports";

const DEFAULT_COLUMNS: Record<ReportType, { key: string; label: string }[]> = {
  CLIENT_DIRECTORY: [
    { key: "id", label: "Client ID" },
    { key: "name", label: "Legal Name" },
    { key: "category", label: "Constitution / Category" },
    { key: "mobile", label: "Mobile" },
    { key: "email", label: "Email Address" },
    { key: "pan", label: "PAN" },
    { key: "gstin", label: "GSTIN" },
    { key: "city", label: "City" },
    { key: "status", label: "Status" },
    { key: "createdAt", label: "Created Date" }
  ],
  CLIENT_LEDGER: [
    { key: "date", label: "Transaction Date" },
    { key: "id", label: "Txn ID / Ref" },
    { key: "type", label: "Transaction Type" },
    { key: "details", label: "Description Details" },
    { key: "debit", label: "Debit (INR)" },
    { key: "credit", label: "Credit (INR)" },
    { key: "runningBalance", label: "Running Balance (INR)" }
  ],
  OUTSTANDING_REPORT: [
    { key: "clientId", label: "Client ID" },
    { key: "clientName", label: "Client Name" },
    { key: "totalBilled", label: "Total Billed (INR)" },
    { key: "totalPaid", label: "Total Received (INR)" },
    { key: "outstandingBalance", label: "Outstanding (INR)" },
    { key: "daysOutstanding", label: "Days Outstanding (Max)" },
    { key: "status", label: "CRM Status" }
  ],
  INVOICE_REGISTER: [
    { key: "id", label: "Invoice Number" },
    { key: "date", label: "Invoice Date" },
    { key: "dueDate", label: "Due Date" },
    { key: "clientName", label: "Client Name" },
    { key: "serviceName", label: "Linked Service" },
    { key: "taxableAmount", label: "Taxable Value (INR)" },
    { key: "cgstAmount", label: "CGST (INR)" },
    { key: "sgstAmount", label: "SGST (INR)" },
    { key: "igstAmount", label: "IGST (INR)" },
    { key: "grandTotal", label: "Grand Total (INR)" },
    { key: "status", label: "Filing / Payment Status" }
  ],
  RECEIPT_REGISTER: [
    { key: "id", label: "Receipt No" },
    { key: "date", label: "Receipt Date" },
    { key: "invoiceId", label: "Invoice Reference" },
    { key: "clientName", label: "Client Name" },
    { key: "amount", label: "Amount Paid (INR)" },
    { key: "mode", label: "Payment Mode" },
    { key: "transactionRef", label: "Transaction Reference" },
    { key: "remarks", label: "Remarks" }
  ],
  PAYMENT_REGISTER: [
    { key: "id", label: "Receipt No" },
    { key: "date", label: "Date" },
    { key: "invoiceId", label: "Invoice Ref" },
    { key: "clientName", label: "Client Name" },
    { key: "amount", label: "Amount (INR)" },
    { key: "mode", label: "Mode" },
    { key: "transactionRef", label: "Txn ID" }
  ],
  EXPENSE_REGISTER: [
    { key: "id", label: "Expense ID" },
    { key: "date", label: "Expense Date" },
    { key: "category", label: "Expense Category" },
    { key: "paidTo", label: "Beneficiary" },
    { key: "amount", label: "Amount (INR)" },
    { key: "paymentMode", label: "Payment Mode" },
    { key: "referenceNumber", label: "Ref Number" },
    { key: "remarks", label: "Remarks / Details" }
  ],
  CASE_REGISTER: [
    { key: "id", label: "Case ID" },
    { key: "clientName", label: "Client Name" },
    { key: "serviceName", label: "Service Name" },
    { key: "priority", label: "Priority" },
    { key: "status", label: "Status" },
    { key: "expectedCompletionDate", label: "Expected Date" },
    { key: "progress", label: "Checklist Progress" },
    { key: "createdAt", label: "Created At" }
  ],
  WORKFLOW_REPORT: [
    { key: "id", label: "Workflow ID" },
    { key: "clientName", label: "Client Name" },
    { key: "serviceName", label: "Workflow Service" },
    { key: "status", label: "Active Status" },
    { key: "currentStep", label: "Current Step" },
    { key: "progress", label: "Steps Completed" },
    { key: "updatedAt", label: "Last Activity" }
  ],
  TASK_REPORT: [
    { key: "id", label: "Task ID" },
    { key: "title", label: "Task Title" },
    { key: "category", label: "Category" },
    { key: "dueDate", label: "Due Date" },
    { key: "status", label: "Task Status" },
    { key: "clientName", label: "Client Reference" },
    { key: "assignedToName", label: "Assigned Executive" }
  ],
  STAFF_PERFORMANCE: [
    { key: "staffId", label: "Staff ID" },
    { key: "staffName", label: "Executive Name" },
    { key: "casesAssigned", label: "Cases Assigned" },
    { key: "casesCompleted", label: "Cases Completed" },
    { key: "pendingCases", label: "Cases Pending" },
    { key: "billingGenerated", label: "Billing Generated (INR)" },
    { key: "checklistCompletionRate", label: "Avg Checklist Progress" }
  ],
  ATTENDANCE_READY: [
    { key: "staffName", label: "Executive Name" },
    { key: "presentDays", label: "Present Days" },
    { key: "absentDays", label: "Absent Days" },
    { key: "lateDays", label: "Late Days" },
    { key: "onLeaveDays", label: "Leave Days" },
    { key: "avgPunchIn", label: "Avg Punch-In" },
    { key: "avgPunchOut", label: "Avg Punch-Out" },
    { key: "attendancePercentage", label: "Attendance Ratio" }
  ],
  COMPLIANCE_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "category", label: "Compliance Category" },
    { key: "serviceName", label: "Service Rendered" },
    { key: "dueDate", label: "Compliance Due Date" },
    { key: "filingStatus", label: "Filing Status" },
    { key: "acknowledgementNo", label: "Acknowledgement / ARN" }
  ],
  GST_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "gstin", label: "GSTIN" },
    { key: "period", label: "Filing Period" },
    { key: "taxableValue", label: "Taxable Value (INR)" },
    { key: "cgst", label: "CGST Amount (INR)" },
    { key: "sgst", label: "SGST Amount (INR)" },
    { key: "igst", label: "IGST Amount (INR)" },
    { key: "totalTax", label: "Total GST Collected (INR)" },
    { key: "status", label: "Status" }
  ],
  ITR_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "pan", label: "PAN Card" },
    { key: "ay", label: "Assessment Year" },
    { key: "form", label: "ITR Form" },
    { key: "taxDue", label: "Tax Payable (INR)" },
    { key: "refundAmount", label: "Refund Claimed (INR)" },
    { key: "filingDate", label: "Filing Date" },
    { key: "status", label: "Filing Status" }
  ],
  TDS_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "tan", label: "TAN Number" },
    { key: "quarter", label: "Filing Quarter" },
    { key: "form", label: "TDS Form" },
    { key: "taxAmount", label: "TDS Amount Deposited (INR)" },
    { key: "filingDate", label: "Filing Date" },
    { key: "status", label: "Status" }
  ],
  PF_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "pfNumber", label: "PF Registration" },
    { key: "month", label: "Filing Month" },
    { key: "employeesCount", label: "Employees Covered" },
    { key: "pfContribution", label: "PF Contribution (INR)" },
    { key: "status", label: "Filing Status" }
  ],
  ESIC_SUMMARY: [
    { key: "clientName", label: "Client Name" },
    { key: "esicNumber", label: "ESIC Number" },
    { key: "month", label: "Filing Month" },
    { key: "employeesCount", label: "Employees Covered" },
    { key: "esicContribution", label: "ESIC Contribution (INR)" },
    { key: "status", label: "Filing Status" }
  ],
  REVENUE_REPORT: [
    { key: "month", label: "Month" },
    { key: "invoicedAmount", label: "Amount Invoiced (INR)" },
    { key: "receivedAmount", label: "Amount Received (INR)" },
    { key: "outstandingAmount", label: "Outstanding Balance (INR)" },
    { key: "invoiceCount", label: "Invoices Generated" }
  ],
  PROFIT_SUMMARY: [
    { key: "month", label: "Month / Period" },
    { key: "revenue", label: "Gross Revenue (INR)" },
    { key: "expenses", label: "Total Expenses (INR)" },
    { key: "netProfit", label: "Net Operating Profit (INR)" },
    { key: "margin", label: "Profit Margin (%)" }
  ],
  MONTHLY_SUMMARY: [
    { key: "month", label: "Calendar Month" },
    { key: "casesCreated", label: "Cases Created" },
    { key: "casesCompleted", label: "Cases Completed" },
    { key: "invoiced", label: "Billed Revenue (INR)" },
    { key: "collected", label: "Collected Cash (INR)" },
    { key: "expenses", label: "Operating Expenses (INR)" },
    { key: "profit", label: "Net Margin (INR)" }
  ],
  QUARTERLY_SUMMARY: [
    { key: "quarter", label: "Financial Quarter" },
    { key: "casesCreated", label: "Cases Created" },
    { key: "casesCompleted", label: "Cases Completed" },
    { key: "invoiced", label: "Billed Revenue (INR)" },
    { key: "collected", label: "Collected Cash (INR)" },
    { key: "expenses", label: "Operating Expenses (INR)" },
    { key: "profit", label: "Net Margin (INR)" }
  ],
  FINANCIAL_YEAR_SUMMARY: [
    { key: "financialYear", label: "Financial Year" },
    { key: "casesCreated", label: "Cases Created" },
    { key: "casesCompleted", label: "Cases Completed" },
    { key: "invoiced", label: "Billed Revenue (INR)" },
    { key: "collected", label: "Collected Cash (INR)" },
    { key: "expenses", label: "Operating Expenses (INR)" },
    { key: "profit", label: "Net Margin (INR)" }
  ]
};

export class TemplateRepository {
  private static templatesCache: ReportTemplate[] = [];
  private static scheduledCache: ScheduledReport[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;

    // Initialize report templates
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (stored) {
      try {
        this.templatesCache = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse report templates", e);
        this.templatesCache = [];
      }
    }

    // Backfill any missing default templates
    let changed = false;
    const allTypes = Object.keys(DEFAULT_COLUMNS) as ReportType[];
    allTypes.forEach((type) => {
      const exists = this.templatesCache.some((t) => t.reportType === type);
      if (!exists) {
        const columns: ReportColumn[] = DEFAULT_COLUMNS[type].map((col) => ({
          key: col.key,
          label: col.label,
          visible: true
        }));

        this.templatesCache.push({
          id: `tmpl_${type.toLowerCase()}`,
          reportType: type,
          name: `${type.replace(/_/g, " ").toLowerCase()} Default Template`,
          columns,
          sortBy: columns[0]?.key || "",
          sortOrder: "desc",
          updatedAt: new Date().toISOString()
        });
        changed = true;
      }
    });

    if (changed) {
      this.persistTemplates();
    }

    // Initialize scheduled reports
    const storedScheduled = localStorage.getItem(SCHEDULER_STORAGE_KEY);
    if (storedScheduled) {
      try {
        this.scheduledCache = JSON.parse(storedScheduled);
      } catch (e) {
        console.error("Failed to parse scheduled reports", e);
        this.scheduledCache = [];
      }
    } else {
      // Seed initial mock scheduler configs to show architecture readiness
      this.scheduledCache = [
        {
          id: "sched_001",
          name: "GST Compliance & Outstanding Summary",
          reportType: "OUTSTANDING_REPORT",
          frequency: "Weekly",
          recipients: ["jainnagarwal90@gmail.com", "staff@jainagarwal.com"],
          format: "PDF",
          isEnabled: true,
          nextRun: new Date(Date.now() + 1000 * 3600 * 24 * 3).toISOString().split("T")[0] + "T09:00:00Z",
          createdAt: new Date().toISOString()
        },
        {
          id: "sched_002",
          name: "Monthly Practice Financial Audit",
          reportType: "PROFIT_SUMMARY",
          frequency: "Monthly",
          recipients: ["jainnagarwal90@gmail.com"],
          format: "Excel",
          isEnabled: false,
          nextRun: new Date(Date.now() + 1000 * 3600 * 24 * 12).toISOString().split("T")[0] + "T18:00:00Z",
          createdAt: new Date().toISOString()
        }
      ];
      this.persistScheduled();
    }

    this.isInitialized = true;
  }

  private static persistTemplates() {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(this.templatesCache));
  }

  private static persistScheduled() {
    localStorage.setItem(SCHEDULER_STORAGE_KEY, JSON.stringify(this.scheduledCache));
  }

  public static getTemplate(reportType: ReportType): ReportTemplate {
    this.init();
    const found = this.templatesCache.find((t) => t.reportType === reportType);
    if (found) return found;

    // Fallback if not found
    const columns: ReportColumn[] = (DEFAULT_COLUMNS[reportType] || []).map((col) => ({
      key: col.key,
      label: col.label,
      visible: true
    }));

    return {
      id: `tmpl_${reportType.toLowerCase()}`,
      reportType,
      name: `${reportType.replace(/_/g, " ").toLowerCase()} Default Template`,
      columns,
      sortBy: columns[0]?.key || "",
      sortOrder: "desc",
      updatedAt: new Date().toISOString()
    };
  }

  public static updateTemplate(reportType: ReportType, updates: Partial<ReportTemplate>): ReportTemplate {
    this.init();
    const idx = this.templatesCache.findIndex((t) => t.reportType === reportType);
    let updated: ReportTemplate;

    if (idx !== -1) {
      updated = {
        ...this.templatesCache[idx],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.templatesCache[idx] = updated;
    } else {
      const fallback = this.getTemplate(reportType);
      updated = {
        ...fallback,
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.templatesCache.push(updated);
    }

    this.persistTemplates();
    return updated;
  }

  public static getScheduledReports(): ScheduledReport[] {
    this.init();
    return this.scheduledCache;
  }

  public static saveScheduledReport(sched: Omit<ScheduledReport, "id" | "createdAt" | "nextRun"> & { id?: string }): ScheduledReport {
    this.init();
    const id = sched.id || `sched_${Date.now()}`;
    const nextRunDate = new Date();
    if (sched.frequency === "Daily") nextRunDate.setDate(nextRunDate.getDate() + 1);
    else if (sched.frequency === "Weekly") nextRunDate.setDate(nextRunDate.getDate() + 7);
    else if (sched.frequency === "Monthly") nextRunDate.setMonth(nextRunDate.getMonth() + 1);
    else nextRunDate.setFullYear(nextRunDate.getFullYear() + 1);

    const completed: ScheduledReport = {
      id,
      name: sched.name,
      reportType: sched.reportType,
      frequency: sched.frequency,
      recipients: sched.recipients,
      format: sched.format,
      isEnabled: sched.isEnabled,
      lastRun: sched.lastRun,
      nextRun: nextRunDate.toISOString(),
      createdAt: new Date().toISOString()
    };

    const existingIdx = this.scheduledCache.findIndex((s) => s.id === id);
    if (existingIdx !== -1) {
      this.scheduledCache[existingIdx] = completed;
    } else {
      this.scheduledCache.push(completed);
    }

    this.persistScheduled();
    return completed;
  }

  public static deleteScheduledReport(id: string): void {
    this.init();
    this.scheduledCache = this.scheduledCache.filter((s) => s.id !== id);
    this.persistScheduled();
  }

  public static getAllReportTypes(): ReportType[] {
    return Object.keys(DEFAULT_COLUMNS) as ReportType[];
  }
}
