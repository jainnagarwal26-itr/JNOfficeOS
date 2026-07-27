/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText, FileSpreadsheet, Settings, Calendar, Printer, Download,
  Filter, RotateCcw, Columns, Check, ChevronDown, Sparkles, Send,
  Plus, Trash2, Eye, ShieldCheck, Mail, CalendarClock, UserCheck, CheckSquare,
  QrCode, ToggleLeft, ToggleRight, Search, FileJson, Info, TrendingUp, AlertCircle
} from "lucide-react";
import { User, ReportType, DocumentType, ReportTemplate, ScheduledReport, Client, Case } from "../types";
import { ReportRepository, ReportFilter, ReportDataResult } from "../lib/reportRepository";
import { PdfRepository, DocumentPayload } from "../lib/pdfRepository";
import { TemplateRepository } from "../lib/templateRepository";
import { getClients, getUsers } from "../lib/db";
import { FinancialRepository, Invoice } from "../lib/financialRepository";
import { CaseRepository } from "../lib/repository";
import { ExpenseRepository, Expense } from "../lib/expenseRepository";
import { eventBus } from "../lib/eventBus";

interface ReportingEngineProps {
  currentUser: User;
  onAddAuditLog?: (
    action: string,
    category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM",
    details: string
  ) => void;
}

export default function ReportingEngine({ currentUser, onAddAuditLog }: ReportingEngineProps) {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"REPORTS" | "DOCUMENTS" | "TEMPLATES" | "SCHEDULER">("REPORTS");

  // Selected Report & Document Types
  const [selectedReportType, setSelectedReportType] = useState<ReportType>("CLIENT_DIRECTORY");
  const [selectedDocType, setSelectedDocType] = useState<DocumentType>("TAX_INVOICE");

  // Filter values
  const [filters, setFilters] = useState<ReportFilter>({
    startDate: "",
    endDate: "",
    financialYear: "2026-27",
    clientId: "",
    staffId: "",
    serviceId: "",
    status: "",
    paymentStatus: "",
    caseStatus: ""
  });

  // Compiled states
  const [reportResult, setReportResult] = useState<ReportDataResult | null>(null);
  const [activeTemplate, setActiveTemplate] = useState<ReportTemplate | null>(null);
  const [documentPayload, setDocumentPayload] = useState<DocumentPayload | null>(null);
  const [schedules, setSchedules] = useState<ScheduledReport[]>([]);

  // Selection targets for Document Generator
  const [targetRecordId, setTargetRecordId] = useState<string>("");
  const [watermarkToggle, setWatermarkToggle] = useState<boolean>(true);
  const [customWatermarkText, setCustomWatermarkText] = useState<string>("CONFIDENTIAL");

  // Dropdown list records (from DB)
  const [clientsList, setClientsList] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [invoicesList, setInvoicesList] = useState<Invoice[]>([]);
  const [casesList, setCasesList] = useState<Case[]>([]);

  // Column config states for current report
  const [tempTemplateColumns, setTempTemplateColumns] = useState<any[]>([]);

  // New Scheduler form state
  const [schedName, setSchedName] = useState("");
  const [schedFreq, setSchedFreq] = useState<"Daily" | "Weekly" | "Monthly" | "Yearly">("Weekly");
  const [schedFormat, setSchedFormat] = useState<"PDF" | "Excel" | "CSV" | "JSON">("PDF");
  const [schedRecipients, setSchedRecipients] = useState("");

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Load static resources & trigger report/doc initial compilation
  useEffect(() => {
    const cls = getClients();
    const stf = getUsers();
    const invs = FinancialRepository.getInvoices(currentUser);
    const css = CaseRepository.getCases(currentUser);

    setClientsList(cls);
    setStaffList(stf);
    setInvoicesList(invs);
    setCasesList(css);

    // Initial Scheduler load
    setSchedules(TemplateRepository.getScheduledReports());

    // Auto-select first target id based on doc type
    if (invs.length > 0) {
      setTargetRecordId(invs[0].id);
    } else if (cls.length > 0) {
      setTargetRecordId(cls[0].id);
    }
  }, []);

  // Sync / Recompile Report when Selected Report Type or Filters change
  useEffect(() => {
    const template = TemplateRepository.getTemplate(selectedReportType);
    setActiveTemplate(template);
    setTempTemplateColumns(template.columns);

    const result = ReportRepository.generateReport(selectedReportType, filters, currentUser);
    setReportResult(result);
  }, [selectedReportType, filters]);

  // Sync / Recompile Document Preview
  useEffect(() => {
    let finalTargetId = targetRecordId;
    if (!finalTargetId) {
      if (selectedDocType === "TAX_INVOICE" || selectedDocType === "RECEIPT" || selectedDocType === "PROFORMA_INVOICE" || selectedDocType === "CREDIT_NOTE" || selectedDocType === "DEBIT_NOTE") {
        finalTargetId = invoicesList[0]?.id || "";
      } else if (selectedDocType === "CLIENT_STATEMENT" || selectedDocType === "OUTSTANDING_STATEMENT") {
        finalTargetId = clientsList[0]?.id || "";
      } else if (selectedDocType === "CASE_SUMMARY") {
        finalTargetId = casesList[0]?.id || "";
      }
    }

    const payload = PdfRepository.generateDocumentData(
      selectedDocType,
      finalTargetId,
      currentUser,
      watermarkToggle ? customWatermarkText : ""
    );
    setDocumentPayload(payload);
  }, [selectedDocType, targetRecordId, watermarkToggle, customWatermarkText, invoicesList, clientsList, casesList]);

  // Reset filters
  const handleResetFilters = () => {
    setFilters({
      startDate: "",
      endDate: "",
      financialYear: "2026-27",
      clientId: "",
      staffId: "",
      serviceId: "",
      status: "",
      paymentStatus: "",
      caseStatus: ""
    });
  };

  // Toggle column visibility instantly
  const handleToggleColumn = (colKey: string) => {
    if (!activeTemplate) return;
    const updatedCols = tempTemplateColumns.map(col => {
      if (col.key === colKey) {
        return { ...col, visible: !col.visible };
      }
      return col;
    });

    setTempTemplateColumns(updatedCols);
    const updatedTemplate = TemplateRepository.updateTemplate(selectedReportType, {
      columns: updatedCols
    });
    setActiveTemplate(updatedTemplate);
  };

  // Update sorting params
  const handleUpdateSort = (key: string) => {
    if (!activeTemplate) return;
    const newOrder = activeTemplate.sortBy === key && activeTemplate.sortOrder === "desc" ? "asc" : "desc";
    const updatedTemplate = TemplateRepository.updateTemplate(selectedReportType, {
      sortBy: key,
      sortOrder: newOrder
    });
    setActiveTemplate(updatedTemplate);

    // Trigger re-generation
    const result = ReportRepository.generateReport(selectedReportType, filters, currentUser);
    setReportResult(result);
  };

  // Scheduled Report handlers
  const handleAddSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedName.trim()) return;

    const emails = schedRecipients.split(",").map(em => em.trim()).filter(Boolean);

    TemplateRepository.saveScheduledReport({
      name: schedName,
      reportType: selectedReportType,
      frequency: schedFreq,
      recipients: emails.length > 0 ? emails : ["jainnagarwal90@gmail.com"],
      format: schedFormat,
      isEnabled: true
    });

    // Reset and reload
    setSchedName("");
    setSchedRecipients("");
    setSchedules(TemplateRepository.getScheduledReports());

    if (onAddAuditLog) {
      onAddAuditLog("SCHEDULED_REPORT_CREATED", "SETTINGS", `Scheduled report rule '${schedName}' initialized for frequency: ${schedFreq}.`);
    }
  };

  const handleToggleSchedule = (id: string) => {
    const sched = schedules.find(s => s.id === id);
    if (!sched) return;

    TemplateRepository.saveScheduledReport({
      ...sched,
      isEnabled: !sched.isEnabled
    });
    setSchedules(TemplateRepository.getScheduledReports());
  };

  const handleDeleteSchedule = (id: string) => {
    TemplateRepository.deleteScheduledReport(id);
    setSchedules(TemplateRepository.getScheduledReports());
  };

  // EXPORT DOWNLOAD SIMULATORS
  const handleExportCSV = () => {
    if (!reportResult) return;
    const visibleCols = activeTemplate?.columns.filter(c => c.visible) || [];
    
    // Header Row
    let csvContent = visibleCols.map(col => `"${col.label}"`).join(",") + "\n";
    
    // Data Rows
    reportResult.data.forEach(row => {
      const rowContent = visibleCols.map(col => {
        const val = row[col.key];
        return val !== undefined ? `"${val.toString().replace(/"/g, '""')}"` : '""';
      }).join(",");
      csvContent += rowContent + "\n";
    });

    // Trigger download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedReportType.toLowerCase()}_export_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Event Bus notification
    PdfRepository.triggerExportEvent("CSV", selectedReportType, currentUser);
    if (onAddAuditLog) {
      onAddAuditLog("EXPORT_CSV_SUCCESS", "SYSTEM", `Exported report data for ${selectedReportType} in raw CSV sheet schema.`);
    }
  };

  const handleExportJSON = () => {
    if (!reportResult) return;
    const dataStr = JSON.stringify(reportResult, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedReportType.toLowerCase()}_export_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    PdfRepository.triggerExportEvent("JSON", selectedReportType, currentUser);
    if (onAddAuditLog) {
      onAddAuditLog("EXPORT_JSON_SUCCESS", "SYSTEM", `Exported JSON tree structure of report ${selectedReportType}.`);
    }
  };

  const handleExportExcel = () => {
    if (!reportResult) return;
    const visibleCols = activeTemplate?.columns.filter(c => c.visible) || [];
    
    // Simulate complex Excel sheet styling via formatted HTML-table XML template
    let xmlContent = `
      <xml xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="utf-8"/><style>table { border-collapse: collapse; } td, th { border: 1px solid #cbd5e1; padding: 6px; font-family: sans-serif; }</style></head>
        <body>
          <h3>Jain Agarwal & Co. - ${reportResult.title}</h3>
          <p>Generated At: ${new Date(reportResult.generatedAt).toLocaleString()} | Generated By: ${reportResult.generatedBy}</p>
          <table>
            <thead>
              <tr style="background-color: #f1f5f9;">
                ${visibleCols.map(col => `<th>${col.label}</th>`).join("")}
              </tr>
            </thead>
            <tbody>
              ${reportResult.data.map(row => `
                <tr>
                  ${visibleCols.map(col => `<td>${row[col.key] !== undefined ? row[col.key] : ""}</td>`).join("")}
                </tr>
              `).join("")}
            </tbody>
          </table>
        </body>
      </xml>
    `;

    const blob = new Blob([xmlContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${selectedReportType.toLowerCase()}_sheet_${new Date().toISOString().split("T")[0]}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    PdfRepository.triggerExportEvent("Excel", selectedReportType, currentUser);
    if (onAddAuditLog) {
      onAddAuditLog("EXPORT_EXCEL_SUCCESS", "SYSTEM", `Compiled multi-column XLS workbook schema for ${selectedReportType}.`);
    }
  };

  const handlePrintDocument = () => {
    const printContent = printAreaRef.current?.innerHTML;
    if (!printContent) return;

    const originalContent = document.body.innerHTML;
    
    // Custom formatted printing iframe/popup
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>${documentPayload?.title || "OfficeOS Document"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @media print {
              body { background: white; color: black; padding: 20px; }
              .no-print { display: none; }
              .watermark-overlay {
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 5rem;
                font-weight: bold;
                color: rgba(148, 163, 184, 0.15);
                white-space: nowrap;
                user-select: none;
                pointer-events: none;
              }
            }
          </style>
        </head>
        <body class="bg-white p-6 font-sans">
          <div class="max-w-4xl mx-auto border border-gray-300 p-8 relative min-h-[11in]">
            ${printContent}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();

    PdfRepository.triggerExportEvent("PDF", selectedDocType, currentUser);
    if (onAddAuditLog) {
      onAddAuditLog("PRINT_DOCUMENT_SUCCESS", "SYSTEM", `Triggered direct system print driver channel for document ref: ${documentPayload?.documentNumber}.`);
    }
  };

  // Dynamic values helper
  const renderCellValue = (row: any, colKey: string) => {
    const val = row[colKey];
    if (val === undefined || val === null) return <span className="text-slate-400">-</span>;
    
    // Format large currencies beautifully
    if (typeof val === "number" && (colKey.toLowerCase().includes("amount") || colKey.toLowerCase().includes("total") || colKey.toLowerCase().includes("billed") || colKey.toLowerCase().includes("paid") || colKey.toLowerCase().includes("debit") || colKey.toLowerCase().includes("credit") || colKey.toLowerCase().includes("balance") || colKey.toLowerCase().includes("revenue") || colKey.toLowerCase().includes("expenses") || colKey.toLowerCase().includes("profit") || colKey.toLowerCase().includes("fees"))) {
      return <span className="font-mono font-bold text-slate-800">₹{val.toLocaleString("en-IN")}</span>;
    }

    if (colKey === "status" || colKey === "filingStatus") {
      const statusColors: Record<string, string> = {
        "Active": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        "Paid": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        "Completed": "bg-emerald-50 text-emerald-700 border-emerald-200/80",
        "Unpaid": "bg-rose-50 text-rose-700 border-rose-200/80",
        "Overdue": "bg-rose-50 text-rose-700 border-rose-200/80",
        "Cancelled": "bg-slate-100 text-slate-600 border-slate-200",
        "Partially Paid": "bg-amber-50 text-amber-700 border-amber-200/80",
        "Under Processing": "bg-cyan-50 text-cyan-700 border-cyan-200/80"
      };

      const colorClass = statusColors[val] || "bg-blue-50 text-blue-700 border-blue-200/80";
      return (
        <span className={`px-2 py-0.5 rounded text-xs border font-medium ${colorClass}`}>
          {val}
        </span>
      );
    }

    if (colKey === "priority") {
      const pColors: Record<string, string> = {
        "Critical": "text-rose-600 font-bold",
        "High": "text-amber-600 font-semibold",
        "Medium": "text-blue-600",
        "Low": "text-slate-500"
      };
      return <span className={`text-xs ${pColors[val] || "text-slate-800"}`}>{val}</span>;
    }

    return <span className="text-slate-700 truncate max-w-[200px] inline-block">{val.toString()}</span>;
  };

  return (
    <div className="w-full min-h-screen bg-[#F4F7FA] text-slate-800 p-6 flex flex-col gap-6" id="reporting-engine-container">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0D2C6C] rounded-lg shadow-md">
              <FileSpreadsheet className="w-6 h-6 text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#0D2C6C]">
                Enterprise Reporting & Document Studio
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Centralized financial registers, regulatory compliance summaries, dynamic paper previews & automated schedulers
              </p>
            </div>
          </div>
        </div>

        {/* Top Segment Controller */}
        <div className="flex bg-white border border-slate-200 p-1 rounded-lg gap-1 shadow-sm">
          {[
            { id: "REPORTS", label: "Report Center", icon: FileSpreadsheet },
            { id: "DOCUMENTS", label: "Document Studio", icon: FileText },
            { id: "TEMPLATES", label: "Template Config", icon: Settings },
            { id: "SCHEDULER", label: "Automated Scheduler", icon: CalendarClock }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-[#0D2C6C] text-white shadow-md shadow-blue-900/10"
                  : "text-slate-600 hover:text-[#0D2C6C] hover:bg-slate-50"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* TAB 1: REPORT CENTER */}
        {activeTab === "REPORTS" && (
          <motion.div
            key="reports-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 xl:grid-cols-4 gap-6"
          >
            {/* Sidebar Filters & Selectors */}
            <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5 h-fit shadow-sm">
              <div>
                <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
                  Select Analytical Report
                </label>
                <div className="relative">
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:border-[#0D2C6C] transition-colors cursor-pointer appearance-none"
                  >
                    <optgroup label="Directories & CRM">
                      <option value="CLIENT_DIRECTORY">Client Directory</option>
                      <option value="CLIENT_LEDGER">Client Ledger Statement</option>
                      <option value="OUTSTANDING_REPORT">Enterprise Outstanding Report</option>
                    </optgroup>
                    <optgroup label="Financial & Registers">
                      <option value="INVOICE_REGISTER">Invoice Register</option>
                      <option value="RECEIPT_REGISTER">Receipt Register</option>
                      <option value="PAYMENT_REGISTER">Payment Register</option>
                      <option value="EXPENSE_REGISTER">Expense Outflow Register</option>
                    </optgroup>
                    <optgroup label="Operations & Staff">
                      <option value="CASE_REGISTER">Case Register</option>
                      <option value="WORKFLOW_REPORT">Active Workflow Report</option>
                      <option value="TASK_REPORT">Compliance Task Status</option>
                      <option value="STAFF_PERFORMANCE">Staff Performance Index</option>
                      <option value="ATTENDANCE_READY">Simulated Attendance Ready</option>
                    </optgroup>
                    <optgroup label="Compliance Registers">
                      <option value="COMPLIANCE_SUMMARY">Compliance Calendar Summary</option>
                      <option value="GST_SUMMARY">GST Filing Audit</option>
                      <option value="ITR_SUMMARY">Income Tax ITR Summary</option>
                      <option value="TDS_SUMMARY">TDS Quarterly summary</option>
                      <option value="PF_SUMMARY">PF Monthly summary</option>
                      <option value="ESIC_SUMMARY">ESIC Monthly summary</option>
                    </optgroup>
                    <optgroup label="Practice BI Centers">
                      <option value="REVENUE_REPORT">Revenue Trends</option>
                      <option value="PROFIT_SUMMARY">Firm Profit summary</option>
                      <option value="MONTHLY_SUMMARY">Monthly Practice summary</option>
                      <option value="QUARTERLY_SUMMARY">Quarterly Practice summary</option>
                      <option value="FINANCIAL_YEAR_SUMMARY">FY Practice summary</option>
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              <div className="border-t border-slate-200 my-1"></div>

              {/* Advanced Filter Panel */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 text-xs font-bold uppercase flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-[#0D2C6C]" />
                    Filters Engine
                  </span>
                  <button
                    onClick={handleResetFilters}
                    className="text-[#0D2C6C] hover:text-[#071D4A] text-xs font-bold flex items-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">Start Date</label>
                    <input
                      type="date"
                      value={filters.startDate}
                      onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    />
                  </div>
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">End Date</label>
                    <input
                      type="date"
                      value={filters.endDate}
                      onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Financial Year</label>
                  <select
                    value={filters.financialYear}
                    onChange={(e) => setFilters({ ...filters, financialYear: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                  >
                    <option value="2026-27">2026-27</option>
                    <option value="2025-26">2025-26</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Filter Client</label>
                  <select
                    value={filters.clientId}
                    onChange={(e) => setFilters({ ...filters, clientId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                  >
                    <option value="">-- All Clients --</option>
                    {clientsList.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Assigned Executive</label>
                  <select
                    value={filters.staffId}
                    onChange={(e) => setFilters({ ...filters, staffId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                  >
                    <option value="">-- All Staff --</option>
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">State / Category Status</label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                  >
                    <option value="">-- All Statuses --</option>
                    <option value="Active">Active</option>
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Paid">Paid</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Overdue">Overdue</option>
                  </select>
                </div>
              </div>

              {/* Active Column Layout Config Helper */}
              <div className="border-t border-slate-200 my-1"></div>
              <div>
                <span className="text-slate-700 text-xs font-bold uppercase flex items-center gap-1.5 mb-3">
                  <Columns className="w-3.5 h-3.5 text-[#0D2C6C]" />
                  Column Visibility
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {tempTemplateColumns.map((col) => (
                    <button
                      key={col.key}
                      onClick={() => handleToggleColumn(col.key)}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border font-medium transition-all ${
                        col.visible
                          ? "bg-[#0D2C6C]/10 text-[#0D2C6C] border-[#0D2C6C]/20"
                          : "bg-slate-50 text-slate-400 border-slate-200"
                      }`}
                    >
                      {col.visible && <Check className="w-2.5 h-2.5" />}
                      {col.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Generated Reports Table Panel */}
            <div className="xl:col-span-3 flex flex-col gap-6">
              {/* Dynamic Summary Cards compiled live from report output */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {reportResult && Object.entries(reportResult.summaryStats).slice(0, 3).map(([label, val], idx) => (
                  <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-[#0D2C6C] to-blue-500"></div>
                    <div>
                      <p className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">{label}</p>
                      <h3 className="text-slate-800 text-xl font-extrabold mt-1 tracking-tight">
                        {typeof val === "number" && (label.toLowerCase().includes("value") || label.toLowerCase().includes("dues") || label.toLowerCase().includes("revenue") || label.toLowerCase().includes("expenses") || label.toLowerCase().includes("billed") || label.toLowerCase().includes("cash") || label.toLowerCase().includes("total") || label.toLowerCase().includes("received"))
                          ? `₹${val.toLocaleString("en-IN")}`
                          : val}
                      </h3>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
                      <TrendingUp className="w-4 h-4 text-[#0D2C6C]" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Core Table Card */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#0D2C6C] animate-pulse" />
                      {reportResult?.title || "Compiled Records"}
                    </h3>
                    <p className="text-slate-400 text-xs mt-0.5">
                      Compiled on: {reportResult ? new Date(reportResult.generatedAt).toLocaleDateString() : ""} | Generated by: {reportResult?.generatedBy}
                    </p>
                  </div>

                  {/* Actions / Export triggers */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleExportCSV}
                      disabled={!reportResult || reportResult.data.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      CSV
                    </button>
                    <button
                      onClick={handleExportExcel}
                      disabled={!reportResult || reportResult.data.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      Excel
                    </button>
                    <button
                      onClick={handleExportJSON}
                      disabled={!reportResult || reportResult.data.length === 0}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                    >
                      <FileJson className="w-3.5 h-3.5 text-amber-600" />
                      JSON
                    </button>
                  </div>
                </div>

                {/* Table Data Render */}
                <div className="overflow-x-auto max-h-[500px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold text-xs tracking-wider">
                        {activeTemplate?.columns.filter(c => c.visible).map(col => (
                          <th
                            key={col.key}
                            onClick={() => handleUpdateSort(col.key)}
                            className="p-4 cursor-pointer hover:bg-slate-100/50 select-none group transition-all"
                          >
                            <div className="flex items-center gap-1">
                              <span>{col.label}</span>
                              <ChevronDown className={`w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ${
                                activeTemplate.sortBy === col.key && activeTemplate.sortOrder === "asc" ? "rotate-180" : ""
                              }`} />
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {reportResult && reportResult.data.length > 0 ? (
                        reportResult.data.map((row, index) => (
                          <tr
                            key={index}
                            className="border-b border-slate-100 hover:bg-slate-50/50 text-xs text-slate-700 transition-colors"
                          >
                            {activeTemplate?.columns.filter(c => c.visible).map(col => (
                              <td key={col.key} className="p-4 align-middle">
                                {renderCellValue(row, col.key)}
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={activeTemplate?.columns.filter(c => c.visible).length || 1}
                            className="p-10 text-center text-slate-400 text-xs"
                          >
                            <Info className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                            No records compiled for current filter configurations. Try adjusting the dates or client selector.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Count */}
                <div className="border-t border-slate-200 p-3 bg-slate-50 flex justify-between items-center text-xs text-slate-500">
                  <span>Total Compiled Output: <b>{reportResult?.data.length || 0}</b> rows</span>
                  <span className="flex items-center gap-1 font-mono text-[10px]">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Verified via Repository Layer
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 2: DOCUMENT STUDIO */}
        {activeTab === "DOCUMENTS" && (
          <motion.div
            key="documents-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-6"
          >
            {/* Sidebar Controls */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-5 h-fit shadow-sm">
              <div>
                <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
                  1. Document Category
                </label>
                <div className="relative">
                  <select
                    value={selectedDocType}
                    onChange={(e) => {
                      setSelectedDocType(e.target.value as DocumentType);
                      setTargetRecordId(""); // Reset record target
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 px-3 text-sm text-slate-800 focus:outline-none focus:border-[#0D2C6C] transition-colors cursor-pointer appearance-none"
                  >
                    <optgroup label="Invoicing & Billing">
                      <option value="TAX_INVOICE">Tax Invoice</option>
                      <option value="PROFORMA_INVOICE">Proforma Invoice</option>
                      <option value="CREDIT_NOTE">Credit Note</option>
                      <option value="DEBIT_NOTE">Debit Note</option>
                      <option value="QUOTATION">Quotation Sheet</option>
                      <option value="ESTIMATE">Cost Estimate</option>
                    </optgroup>
                    <optgroup label="Receipts & Payments">
                      <option value="RECEIPT">Payment Receipt Voucher</option>
                    </optgroup>
                    <optgroup label="Client Ledgers">
                      <option value="CLIENT_STATEMENT">Statement of Account (SOA)</option>
                      <option value="OUTSTANDING_STATEMENT">Outstanding Demand statement</option>
                    </optgroup>
                    <optgroup label="Operational Briefings">
                      <option value="CASE_SUMMARY">Case Progress Summary</option>
                    </optgroup>
                  </select>
                  <ChevronDown className="absolute right-3 top-3.5 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
              </div>

              {/* Dynamic Target Selection */}
              <div>
                <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
                  2. Select Source Record
                </label>
                <select
                  value={targetRecordId}
                  onChange={(e) => setTargetRecordId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                >
                  {(selectedDocType === "TAX_INVOICE" || selectedDocType === "RECEIPT" || selectedDocType === "PROFORMA_INVOICE" || selectedDocType === "CREDIT_NOTE" || selectedDocType === "DEBIT_NOTE") && (
                    <>
                      {invoicesList.map(inv => (
                        <option key={inv.id} value={inv.id}>{inv.id} - {inv.clientName} (₹{inv.grandTotal})</option>
                      ))}
                      {invoicesList.length === 0 && <option value="">No Invoices Available</option>}
                    </>
                  )}

                  {(selectedDocType === "CLIENT_STATEMENT" || selectedDocType === "OUTSTANDING_STATEMENT") && (
                    <>
                      {clientsList.map(c => (
                        <option key={c.id} value={c.id}>{c.id} - {c.name}</option>
                      ))}
                      {clientsList.length === 0 && <option value="">No Clients Available</option>}
                    </>
                  )}

                  {(selectedDocType === "CASE_SUMMARY") && (
                    <>
                      {casesList.map(cs => (
                        <option key={cs.id} value={cs.id}>{cs.id} - {cs.serviceName}</option>
                      ))}
                      {casesList.length === 0 && <option value="">No Cases Available</option>}
                    </>
                  )}

                  {(selectedDocType === "QUOTATION" || selectedDocType === "ESTIMATE") && (
                    <option value="EST_MOCK_001">Demo / Scope Proposal (Autogen)</option>
                  )}
                </select>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Selecting a record automatically compiles fields, ledgers, items, and tax totals from the Repository.
                </p>
              </div>

              <div className="border-t border-slate-200 my-1"></div>

              {/* Custom Watermark & Letterhead Controls */}
              <div className="flex flex-col gap-4">
                <span className="text-slate-700 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Printer className="w-3.5 h-3.5 text-[#0D2C6C]" />
                  Print Customization
                </span>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500 text-xs">Include Watermark Draft</span>
                  <button
                    onClick={() => setWatermarkToggle(!watermarkToggle)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {watermarkToggle ? (
                      <ToggleRight className="w-8 h-8 text-[#0D2C6C]" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-slate-300" />
                    )}
                  </button>
                </div>

                {watermarkToggle && (
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">Watermark Text</label>
                    <select
                      value={customWatermarkText}
                      onChange={(e) => setCustomWatermarkText(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    >
                      <option value="CONFIDENTIAL">CONFIDENTIAL</option>
                      <option value="DRAFT">DRAFT COPY</option>
                      <option value="OFFICIAL">OFFICIAL USE ONLY</option>
                      <option value="DUPLICATE">DUPLICATE COPY</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 my-1"></div>

              {/* Trigger Direct System Print Dialogue */}
              <button
                onClick={handlePrintDocument}
                disabled={!documentPayload}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#0D2C6C] hover:bg-[#071D4A] text-white font-bold text-xs rounded-lg shadow-md hover:shadow-blue-900/10 transition-all cursor-pointer disabled:opacity-50"
              >
                <Printer className="w-4 h-4" />
                <span>Download / Print PDF Layout</span>
              </button>
            </div>

            {/* Document Interactive Sheet Preview (Interactive CA Studio) */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                Visual Paper Canvas (A4 Simulated Layout)
              </span>

              {/* simulated sheet */}
              <div className="bg-white text-slate-900 rounded-xl overflow-hidden shadow-2xl relative select-text">
                
                {/* Print area wrapper */}
                <div ref={printAreaRef} className="p-8 relative min-h-[9.5in] flex flex-col justify-between">
                  
                  {/* WATERMARK WATERMARK */}
                  {watermarkToggle && customWatermarkText && (
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none select-none z-0">
                      <span className="text-[6rem] font-bold text-slate-300/15 uppercase tracking-widest transform -rotate-45 block whitespace-nowrap">
                        {customWatermarkText}
                      </span>
                    </div>
                  )}

                  <div className="relative z-10 flex flex-col gap-6">
                    {/* 1. Letterhead */}
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4 border-b-2 border-slate-900 pb-5">
                      <div className="flex flex-col">
                        <span className="font-bold text-lg tracking-wide uppercase text-slate-900">
                          {documentPayload?.senderName}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium italic">
                          {documentPayload?.senderTagline}
                        </span>
                        <span className="text-[10px] text-slate-600 max-w-sm mt-2 leading-relaxed">
                          {documentPayload?.senderAddress}
                        </span>
                        <span className="text-[10px] text-slate-600 font-medium mt-1">
                          Phone: {documentPayload?.senderContact} | Email: {documentPayload?.senderEmail}
                        </span>
                      </div>
                      <div className="flex flex-col items-end text-right">
                        <span className="px-3 py-1 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded">
                          {documentPayload?.title}
                        </span>
                        <span className="text-[10px] text-slate-500 font-bold mt-2">
                          Doc Ref: {documentPayload?.documentNumber}
                        </span>
                        <span className="text-[10px] text-slate-600">
                          Dated: {documentPayload?.date}
                        </span>
                        {documentPayload?.dueDate && (
                          <span className="text-[10px] text-rose-600 font-semibold mt-0.5">
                            Due Date: {documentPayload.dueDate}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 2. Addresses info block */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px] leading-relaxed">
                      <div className="bg-slate-50 border border-slate-100 p-3 rounded">
                        <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                          Billed To / Recipient
                        </span>
                        <span className="font-bold text-slate-900 block">{documentPayload?.recipientName}</span>
                        <span className="text-slate-600 block mt-1">{documentPayload?.recipientAddress}</span>
                        {documentPayload?.recipientContact && (
                          <span className="text-slate-600 block">Mobile: {documentPayload.recipientContact}</span>
                        )}
                        {documentPayload?.recipientEmail && (
                          <span className="text-slate-600 block">Email: {documentPayload.recipientEmail}</span>
                        )}
                      </div>

                      <div className="bg-slate-50 border border-slate-100 p-3 rounded flex flex-col justify-between">
                        <div>
                          <span className="text-slate-400 font-bold uppercase tracking-wider block mb-1">
                            Registration details
                          </span>
                          {documentPayload?.recipientGstin && (
                            <span className="text-slate-700 block"><b>GSTIN:</b> {documentPayload.recipientGstin}</span>
                          )}
                          {documentPayload?.recipientPan && (
                            <span className="text-slate-700 block"><b>PAN:</b> {documentPayload.recipientPan}</span>
                          )}
                        </div>
                        <div className="mt-3">
                          <span className="text-[10px] text-slate-500 font-medium block"><b>Firm Pan:</b> {documentPayload?.senderPan}</span>
                          <span className="text-[10px] text-slate-500 font-medium block"><b>Firm GSTIN:</b> {documentPayload?.senderGstin}</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. Itemized list Table */}
                    <div className="border border-slate-300 rounded overflow-hidden">
                      <table className="w-full text-left text-[11px] border-collapse">
                        <thead>
                          <tr className="bg-slate-100 border-b border-slate-300 font-bold text-slate-700">
                            {documentPayload?.columns.map(col => (
                              <th
                                key={col.key}
                                className={`p-2.5 ${
                                  col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                }`}
                              >
                                {col.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {documentPayload?.items.map((row, rIdx) => (
                            <tr key={rIdx} className="border-b border-slate-200 text-slate-800">
                              {documentPayload.columns.map(col => (
                                <td
                                  key={col.key}
                                  className={`p-2.5 whitespace-pre-wrap ${
                                    col.align === "right" ? "text-right" : col.align === "center" ? "text-center" : "text-left"
                                  }`}
                                >
                                  {row[col.key]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* 4. Total and breakdown info */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 mt-2">
                      <div className="md:col-span-7 flex flex-col gap-2">
                        {documentPayload?.senderBankDetails && (
                          <div className="bg-slate-50 border border-slate-100 p-3 rounded text-[10px] leading-normal text-slate-600">
                            <span className="font-bold text-slate-900 uppercase block mb-1">Bank Payment details</span>
                            <span>Bank: {documentPayload.senderBankDetails.bankName}</span><br />
                            <span>A/C Holder: {documentPayload.senderBankDetails.accountHolderName}</span><br />
                            <span>A/C No: {documentPayload.senderBankDetails.accountNo}</span><br />
                            <span>IFSC Code: {documentPayload.senderBankDetails.ifscCode}</span><br />
                            <span>UPI VPA: {documentPayload.senderBankDetails.upiId}</span>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-5 flex flex-col gap-1 text-[11px] font-medium text-slate-700">
                        {documentPayload?.subTotal !== undefined && (
                          <div className="flex justify-between py-1 border-b border-slate-100">
                            <span>Subtotal:</span>
                            <span className="font-bold text-slate-950">₹{documentPayload.subTotal.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        {documentPayload?.cgst !== undefined && documentPayload.cgst > 0 && (
                          <>
                            <div className="flex justify-between py-0.5">
                              <span>CGST:</span>
                              <span>₹{documentPayload.cgst.toLocaleString("en-IN")}</span>
                            </div>
                            <div className="flex justify-between py-0.5 border-b border-slate-100">
                              <span>SGST:</span>
                              <span>₹{documentPayload.sgst?.toLocaleString("en-IN")}</span>
                            </div>
                          </>
                        )}
                        {documentPayload?.grandTotal !== undefined && (
                          <div className="flex justify-between py-2 text-slate-900 border-b-2 border-slate-900 font-bold">
                            <span className="text-xs">GRAND TOTAL:</span>
                            <span className="text-xs">₹{documentPayload.grandTotal.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. In words and Terms */}
                    {documentPayload?.amountInWords && (
                      <p className="text-[10px] text-slate-600 italic">
                        <b>In Words:</b> {documentPayload.amountInWords}
                      </p>
                    )}

                    <div className="text-[9px] text-slate-500 leading-normal border-t border-slate-100 pt-3">
                      <span className="font-bold uppercase block mb-1">Terms & Conditions / Declarations</span>
                      <p className="mb-2">{documentPayload?.declaration}</p>
                      <ul className="list-disc pl-3 flex flex-col gap-0.5">
                        {documentPayload?.terms.slice(0, 3).map((t, idx) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* 6. Legal Footer & Signatures */}
                  <div className="relative z-10 flex flex-col sm:flex-row justify-between items-end gap-6 mt-10 border-t border-slate-200 pt-6">
                    {/* Dynamic QR block */}
                    <div className="flex items-center gap-3">
                      <div className="p-1 border border-slate-300 bg-white rounded">
                        <img
                          src={documentPayload?.qrCodeUrl}
                          alt="Dynamic UPI QR"
                          className="w-16 h-16 pointer-events-none select-none"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div className="text-[9px] text-slate-500 leading-tight">
                        <span className="font-bold text-slate-700 block">UPI Instant Pay QR</span>
                        <span>Scan to clear professional fee balance instantly via SBI gateway.</span>
                      </div>
                    </div>

                    {/* Signature block with script font simulation */}
                    <div className="flex flex-col items-center text-center">
                      <div className="text-[11px] text-slate-800 font-semibold mb-1">
                        CA. Jain Agarwal (Managing Partner)
                      </div>
                      <div className="font-serif italic text-cyan-800 font-bold text-base leading-none py-1 border-b border-slate-400 w-36">
                        Jain Agarwal
                      </div>
                      <div className="text-[8px] text-slate-400 mt-1 uppercase tracking-wider">
                        Digitally Authenticated / Authorized Signatory
                      </div>
                    </div>
                  </div>

                </div>

                {/* Simulated metadata strip */}
                <div className="bg-slate-100 border-t border-slate-200 px-6 py-3 flex justify-between items-center text-[10px] text-slate-500 font-medium">
                  <span>Compiled via PDF Studio Engine</span>
                  <span className="font-mono text-[9px]">Hash ID: {documentPayload?.generatedAt}</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 3: TEMPLATES CONFIG */}
        {activeTab === "TEMPLATES" && (
          <motion.div
            key="templates-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-6"
          >
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Settings className="w-4 h-4 text-[#0D2C6C]" />
                Select Target Layout
              </h3>
              <p className="text-slate-500 text-xs">
                Configure defaults (columns, sorting, filters, groups) that apply dynamically when users export reports.
              </p>

              <div className="flex flex-col gap-2 max-h-[350px] overflow-y-auto pr-1">
                {TemplateRepository.getAllReportTypes().map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedReportType(type)}
                    className={`text-left p-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      selectedReportType === type
                        ? "bg-[#0D2C6C]/10 text-[#0D2C6C] border-[#0D2C6C]/20 shadow-sm"
                        : "bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    {type.replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6 shadow-sm">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Layout Schema: {selectedReportType.replace(/_/g, " ")}
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Check columns to show by default. drag columns, configure default sorting indexes.
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                <div className="p-4 border-b border-slate-200 bg-slate-100/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-600">Default Columns Scheme</span>
                  <span className="text-[10px] bg-[#0D2C6C]/10 text-[#0D2C6C] px-2 py-0.5 rounded border border-[#0D2C6C]/20 font-bold">
                    {tempTemplateColumns.filter(c => c.visible).length} / {tempTemplateColumns.length} Visible
                  </span>
                </div>

                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto">
                  {tempTemplateColumns.map((col) => (
                    <div
                      key={col.key}
                      onClick={() => handleToggleColumn(col.key)}
                      className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer select-none transition-all ${
                        col.visible
                          ? "bg-white border-slate-200 text-slate-700 hover:border-slate-300 shadow-sm"
                          : "bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs font-semibold">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          col.visible ? "bg-[#0D2C6C] border-[#0D2C6C] text-white" : "border-slate-300 bg-white"
                        }`}>
                          {col.visible && <Check className="w-3 h-3" />}
                        </div>
                        <span>{col.label}</span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-400">{col.key}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sorting and Grouping Configs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Default Sort Index</label>
                  <select
                    value={activeTemplate?.sortBy || ""}
                    onChange={(e) => {
                      const updated = TemplateRepository.updateTemplate(selectedReportType, { sortBy: e.target.value });
                      setActiveTemplate(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                  >
                    {tempTemplateColumns.map(col => (
                      <option key={col.key} value={col.key}>{col.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Default Sort Direction</label>
                  <select
                    value={activeTemplate?.sortOrder || "desc"}
                    onChange={(e) => {
                      const updated = TemplateRepository.updateTemplate(selectedReportType, { sortOrder: e.target.value as any });
                      setActiveTemplate(updated);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                  >
                    <option value="desc">Descending (Latest / Highest First)</option>
                    <option value="asc">Ascending (Earliest / Lowest First)</option>
                  </select>
                </div>
              </div>

              <div className="p-4 bg-[#0D2C6C]/5 border border-[#0D2C6C]/10 rounded-xl flex items-start gap-3 text-xs text-slate-600">
                <Info className="w-5 h-5 text-[#0D2C6C] shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  These template configurations are written safely to the practice&apos;s local cache under <b>jn_officeos_report_templates</b>. All tabular outputs, sorting algorithms, and export routines honor these options.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB 4: AUTOMATED SCHEDULER */}
        {activeTab === "SCHEDULER" && (
          <motion.div
            key="scheduler-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.15 }}
            className="grid grid-cols-1 xl:grid-cols-3 gap-6"
          >
            {/* Form Creator */}
            <div className="xl:col-span-1 bg-white border border-slate-200 rounded-xl p-5 flex flex-col gap-4 shadow-sm">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <CalendarClock className="w-4 h-4 text-[#0D2C6C]" />
                  Create Automatic Report Schedule
                </h3>
                <p className="text-slate-500 text-xs mt-1">
                  Configure the scheduling daemon to automatically compile, render and email summaries to your client or executive desk.
                </p>
              </div>

              <div className="border-t border-slate-200 my-1"></div>

              <form onSubmit={handleAddSchedule} className="flex flex-col gap-4">
                <div>
                  <label className="text-slate-500 text-xs block mb-1">Rule/Schedule Name</label>
                  <input
                    type="text"
                    value={schedName}
                    onChange={(e) => setSchedName(e.target.value)}
                    placeholder="e.g. Weekly Outstanding Reminders"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    required
                  />
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Target Analytical Report</label>
                  <select
                    value={selectedReportType}
                    onChange={(e) => setSelectedReportType(e.target.value as ReportType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                  >
                    <option value="OUTSTANDING_REPORT">Enterprise Outstanding Report</option>
                    <option value="GST_SUMMARY">GST Filing Audit</option>
                    <option value="PROFIT_SUMMARY">Firm Profit summary</option>
                    <option value="CLIENT_DIRECTORY">Client Directory</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-500 text-xs block mb-1">Frequency</label>
                    <select
                      value={schedFreq}
                      onChange={(e) => setSchedFreq(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                    >
                      <option value="Daily">Daily</option>
                      <option value="Weekly">Weekly</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Yearly">Yearly</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-500 text-xs block mb-1">Format</label>
                    <select
                      value={schedFormat}
                      onChange={(e) => setSchedFormat(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                    >
                      <option value="PDF">PDF Layout</option>
                      <option value="Excel">Excel workbook</option>
                      <option value="CSV">CSV Sheet</option>
                      <option value="JSON">JSON Tree</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-slate-500 text-xs block mb-1">Recipients (comma separated emails)</label>
                  <textarea
                    value={schedRecipients}
                    onChange={(e) => setSchedRecipients(e.target.value)}
                    placeholder="jainnagarwal90@gmail.com, staff@jainagarwal.com"
                    className="w-full h-20 bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] resize-none"
                    required
                  ></textarea>
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#0D2C6C] hover:bg-[#071D4A] text-white font-bold text-xs rounded-lg shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Register Scheduler Rule</span>
                </button>
              </form>
            </div>

            {/* Configured Schedules List */}
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-xl p-6 flex flex-col gap-6 shadow-sm">
              <div>
                <h3 className="text-base font-extrabold text-slate-800">
                  Configured Automated Schedules
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Prepare architecture parameters and daemons. These triggers compile in the background and notify the recipient list.
                </p>
              </div>

              <div className="flex flex-col gap-4">
                {schedules.map((item) => (
                  <div
                    key={item.id}
                    className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all hover:border-slate-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <Mail className="w-5 h-5 text-[#0D2C6C]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-slate-800">{item.name}</h4>
                          <span className="px-1.5 py-0.5 bg-white text-slate-500 border border-slate-200 rounded text-[9px] font-mono font-bold">
                            {item.format}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs mt-1">
                          Report: <b>{item.reportType.replace(/_/g, " ")}</b>
                        </p>
                        <p className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap gap-1.5">
                          <span>Frequency: <b>{item.frequency}</b></span> |
                          <span>Next Run: <b>{new Date(item.nextRun).toLocaleString()}</b></span>
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-slate-600 mt-2 bg-white border border-slate-200 p-1 px-2 rounded-md w-fit shadow-sm">
                          <Send className="w-3 h-3 text-[#0D2C6C] shrink-0" />
                          <span className="truncate max-w-[250px] font-medium">{item.recipients.join(", ")}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center">
                      {/* Toggle Enable button */}
                      <button
                        onClick={() => handleToggleSchedule(item.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                          item.isEnabled
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-400 border-slate-200"
                        }`}
                      >
                        {item.isEnabled ? "ACTIVE" : "PAUSED"}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteSchedule(item.id)}
                        className="p-1.5 bg-white text-slate-400 hover:text-rose-600 border border-slate-200 rounded-lg transition-colors cursor-pointer shadow-sm"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}

                {schedules.length === 0 && (
                  <div className="p-10 border border-dashed border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    <Calendar className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                    No report schedules configured yet. Use the registration form to initialize a background daemon rule.
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
