/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  LayoutDashboard, Search, FileSpreadsheet, Download, Printer, PlusCircle, 
  X, Briefcase, Users, FileText, Landmark, UserCheck, ShieldAlert, Check, 
  Settings, RefreshCw, Sparkles, Filter, ChevronRight, Eye, Calendar, DollarSign,
  AlertCircle
} from "lucide-react";
import { User, UserRole, Client, Service, Case, FirmSettings, ActiveWorkflow } from "../types";
import { getClients, getServices, getUsers, getWorkflows } from "../lib/db";
import { CaseRepository } from "../lib/repository";
import { FinancialRepository, Invoice } from "../lib/financialRepository";
import { ExpenseRepository, Expense } from "../lib/expenseRepository";
import DashboardOverview from "./DashboardOverview";

// Import modular sub-components
import KPISection from "./dashboard/KPISection";
import AnalyticsCharts from "./dashboard/AnalyticsCharts";
import OfficeQueueAndAlerts from "./dashboard/OfficeQueueAndAlerts";
import StaffAndClients from "./dashboard/StaffAndClients";

interface ExecutiveDashboardProps {
  currentUser: User;
  settings: FirmSettings;
  onUpdateSettings: (newSettings: FirmSettings) => void;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
  setActiveView: (view: string) => void;
}

export default function ExecutiveDashboard({
  currentUser,
  settings,
  onUpdateSettings,
  onAddAuditLog,
  setActiveView
}: ExecutiveDashboardProps) {

  // Primary navigation: "BI_ANALYTICS" or "DATABASE_SYNC"
  const [activeTab, setActiveTab] = useState<"BI_ANALYTICS" | "DATABASE_SYNC">("BI_ANALYTICS");

  // Data States
  const [clients, setClients] = useState<Client[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [workflows, setWorkflows] = useState<ActiveWorkflow[]>([]);

  // Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedSearchResult, setSelectedSearchResult] = useState<any | null>(null);

  // Export States
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportProgress, setExportProgress] = useState(-1); // -1 = idle
  const [exportFormat, setExportFormat] = useState<"PDF" | "XLSX" | "CSV" | "PRINT">("PDF");
  const [exportModules, setExportModules] = useState({
    financials: true,
    operations: true,
    clients: true,
    compliance: true,
    auditLogs: false
  });

  // Load repositories on mount and when views would change
  useEffect(() => {
    try {
      const loadedClients = getClients();
      const loadedCases = CaseRepository.getCases(currentUser);
      const loadedInvoices = FinancialRepository.getInvoices(currentUser);
      const loadedExpenses = ExpenseRepository.getExpenses(currentUser);
      const loadedStaff = getUsers();
      const loadedWorkflows = getWorkflows();

      setClients(loadedClients);
      setCases(loadedCases);
      setInvoices(loadedInvoices);
      setExpenses(loadedExpenses);
      setStaffList(loadedStaff);
      setWorkflows(loadedWorkflows);
    } catch (err) {
      console.error("Failed to load dashboard repository data", err);
    }
  }, [currentUser]);


  // ----------------------------------------------------
  // UNIVERSAL SEARCH ENGINE
  // ----------------------------------------------------
  const getSearchResults = () => {
    if (!searchQuery.trim()) return { clients: [], cases: [], invoices: [], staff: [] };
    const query = searchQuery.toLowerCase().trim();

    const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(query) ||
      (c.tradeName && c.tradeName.toLowerCase().includes(query)) ||
      (c.gstin && c.gstin.toLowerCase().includes(query)) ||
      (c.pan && c.pan.toLowerCase().includes(query)) ||
      c.mobile.includes(query) ||
      c.email.toLowerCase().includes(query)
    );

    const filteredCases = cases.filter(c => 
      c.id.toLowerCase().includes(query) ||
      c.clientName.toLowerCase().includes(query) ||
      c.serviceName.toLowerCase().includes(query) ||
      c.status.toLowerCase().includes(query)
    );

    const filteredInvoices = invoices.filter(inv => 
      inv.id.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      inv.serviceName.toLowerCase().includes(query) ||
      inv.status.toLowerCase().includes(query)
    );

    const filteredStaff = staffList.filter(s => 
      s.name.toLowerCase().includes(query) ||
      s.email.toLowerCase().includes(query) ||
      s.role.toLowerCase().includes(query)
    );

    return {
      clients: filteredClients.slice(0, 4),
      cases: filteredCases.slice(0, 4),
      invoices: filteredInvoices.slice(0, 4),
      staff: filteredStaff.slice(0, 4)
    };
  };

  const results = getSearchResults();
  const hasResults = results.clients.length > 0 || results.cases.length > 0 || results.invoices.length > 0 || results.staff.length > 0;

  // ----------------------------------------------------
  // SIMULATED EXPORT MECHANISM
  // ----------------------------------------------------
  const handleStartExport = () => {
    setExportProgress(0);
    onAddAuditLog(
      `BI_REPORT_EXPORT_INITIATED`,
      "SYSTEM",
      `Initiated analytical ${exportFormat} export containing selected firm ledger metrics.`
    );
  };

  useEffect(() => {
    if (exportProgress >= 0 && exportProgress < 100) {
      const interval = setInterval(() => {
        setExportProgress(prev => {
          const next = prev + Math.floor(Math.random() * 15) + 5;
          return next > 100 ? 100 : next;
        });
      }, 350);
      return () => clearInterval(interval);
    } else if (exportProgress === 100) {
      // Simulate file download trigger
      const timer = setTimeout(() => {
        setExportProgress(-1);
        setShowExportModal(false);
        // Toast notification triggers naturally via state reset
        onAddAuditLog(
          `BI_REPORT_EXPORT_COMPLETED`,
          "SYSTEM",
          `Successfully compiled and downloaded firm performance report in ${exportFormat} format.`
        );
        alert(`Success! Your compiled report has been exported in ${exportFormat} format.`);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [exportProgress, exportFormat]);


  return (
    <div className="min-h-screen bg-[#152952] text-slate-100 flex flex-col relative pb-12">
      
      {/* Background radial atmosphere */}
      <div className="absolute top-0 left-0 right-0 h-[400px] bg-gradient-to-b from-[#1C3A7A]/10 to-transparent pointer-events-none z-0"></div>

      {/* TOP HEADER STATUS & NAVIGATION BAR */}
      <header className="border-b border-blue-900/35 bg-[#102043]/80 backdrop-blur-md px-6 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-10">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-to-br from-[#D4AF37] to-[#AA8417] p-2 rounded-xl shrink-0 shadow-lg shadow-amber-950/10">
            <LayoutDashboard className="w-5 h-5 text-[#152952]" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-[#D4AF37] tracking-widest uppercase block">Jain Agarwal & Co.</span>
            <h1 className="text-sm font-bold tracking-tight text-white mt-0.5">Executive Practice Workspace</h1>
          </div>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex bg-slate-950/40 p-1 rounded-xl border border-blue-950/65 shrink-0 self-stretch md:self-auto">
          <button
            onClick={() => setActiveTab("BI_ANALYTICS")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === "BI_ANALYTICS" ? "bg-[#0D2C6C] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            Executive BI Analytics
          </button>
          <button
            onClick={() => setActiveTab("DATABASE_SYNC")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === "DATABASE_SYNC" ? "bg-[#0D2C6C] text-[#D4AF37] border border-[#D4AF37]/30 shadow-md" : "text-slate-400 hover:text-slate-200"}`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Sheets Database Link
          </button>
        </div>
      </header>

      {/* RENDER CHOSEN WORKSPACE WINDOW */}
      {activeTab === "DATABASE_SYNC" ? (
        <div className="p-6 z-10">
          <DashboardOverview 
            currentUser={currentUser}
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onAddAuditLog={(action, cat, details) => onAddAuditLog(action, cat, details)}
          />
        </div>
      ) : (
        <main className="p-6 space-y-6 z-10 max-w-7xl mx-auto w-full">
          
          {/* CONTROL STRIP: GLOBAL SEARCH & QUICK ACTION TRIGGERS */}
          <section className="bg-[#1F356B] border border-blue-900/25 p-5 rounded-3xl shadow-xl flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 relative">
            
            {/* Global Search Bar */}
            <div className="flex-1 relative">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                placeholder="Universal Search (e.g. CLI-0001, CASE-2026-0001, PAN, Client Name, Staff, GSTIN...)"
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-blue-950/60 rounded-2xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#D4AF37]/40 focus:ring-1 focus:ring-[#D4AF37]/25"
              />

              {/* SEARCH RESULTS DROP DOWN OVERLAY */}
              <AnimatePresence>
                {showSearchResults && searchQuery.trim() && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSearchResults(false)}></div>
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute left-0 right-0 mt-2 bg-[#061026] border border-blue-950/70 p-4 rounded-2xl shadow-2xl z-50 max-h-96 overflow-y-auto space-y-3"
                    >
                      <div className="flex justify-between items-center border-b border-blue-950/45 pb-2 mb-1">
                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Search Results</span>
                        <button onClick={() => setShowSearchResults(false)} className="text-slate-400 hover:text-white">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {!hasResults ? (
                        <div className="text-center py-6 text-xs text-slate-500">
                          No matching records found. Try querying by names, serial formats or tax IDs.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Matching Clients */}
                          {results.clients.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Client Profiles</span>
                              {results.clients.map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => { setSelectedSearchResult({ type: "client", data: c }); setShowSearchResults(false); }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/15 hover:bg-blue-950/30 border border-blue-950/35 cursor-pointer transition-colors"
                                >
                                  <span className="text-xs text-white font-medium truncate max-w-[240px]">{c.name}</span>
                                  <span className="text-[9px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 rounded">{c.id}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Matching Cases */}
                          {results.cases.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Case Files</span>
                              {results.cases.map(c => (
                                <div 
                                  key={c.id} 
                                  onClick={() => { setSelectedSearchResult({ type: "case", data: c }); setShowSearchResults(false); }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/15 hover:bg-blue-950/30 border border-blue-950/35 cursor-pointer transition-colors"
                                >
                                  <span className="text-xs text-white font-medium truncate max-w-[240px]">{c.serviceName} ({c.clientName})</span>
                                  <span className="text-[9px] font-mono bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/25 px-1.5 rounded">{c.id}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Matching Invoices */}
                          {results.invoices.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Invoices</span>
                              {results.invoices.map(inv => (
                                <div 
                                  key={inv.id} 
                                  onClick={() => { setSelectedSearchResult({ type: "invoice", data: inv }); setShowSearchResults(false); }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/15 hover:bg-blue-950/30 border border-blue-950/35 cursor-pointer transition-colors"
                                >
                                  <span className="text-xs text-white font-medium truncate max-w-[240px]">{inv.id} - {inv.clientName}</span>
                                  <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 rounded">₹{inv.grandTotal.toLocaleString()}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Matching Staff */}
                          {results.staff.length > 0 && (
                            <div className="space-y-1.5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block pl-1">Executive Staff</span>
                              {results.staff.map(s => (
                                <div 
                                  key={s.id} 
                                  onClick={() => { setSelectedSearchResult({ type: "staff", data: s }); setShowSearchResults(false); }}
                                  className="flex items-center justify-between p-2 rounded-xl bg-blue-950/15 hover:bg-blue-950/30 border border-blue-950/35 cursor-pointer transition-colors"
                                >
                                  <span className="text-xs text-white font-medium truncate max-w-[240px]">{s.name}</span>
                                  <span className="text-[9px] font-mono bg-purple-500/10 text-purple-400 border border-purple-500/20 px-1.5 rounded">{s.role === "OWNER" ? "SuperAdmin" : s.role}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Quick Actions Buttons */}
            <div className="flex gap-2 shrink-0">
              <button 
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-blue-950/35 hover:bg-blue-950/60 border border-blue-950/50 rounded-xl text-xs font-semibold text-[#D4AF37] cursor-pointer transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Report Portfolio</span>
              </button>

              <button 
                onClick={() => setActiveView("cases")}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#D4AF37] hover:bg-[#AA8417] rounded-xl text-xs font-bold text-[#152952] cursor-pointer transition-colors shadow-lg shadow-amber-900/15"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Process New Case</span>
              </button>
            </div>

          </section>

          {/* MAIN GRID COMPONENTS */}
          
          {/* SECTION 1: 18 METRIC KPI SECTION */}
          <KPISection 
            clients={clients}
            cases={cases}
            invoices={invoices}
            staffList={staffList}
            workflowsCount={workflows.length}
          />

          {/* SECTION 2: OFFICE QUEUE AND NOTIFICATION BOXES */}
          <OfficeQueueAndAlerts 
            cases={cases}
            workflows={workflows}
            invoices={invoices}
            onActionClick={(target) => setActiveView(target)}
          />

          {/* SECTION 3: VISUAL CHARTS BENTO BLOCK */}
          <AnalyticsCharts 
            clients={clients}
            cases={cases}
            invoices={invoices}
            expenses={expenses}
            staffList={staffList}
            workflows={workflows}
          />

          {/* SECTION 4: STAFF EFFICIENCY AND CLIENT INSIGHTS */}
          <StaffAndClients 
            clients={clients}
            cases={cases}
            invoices={invoices}
            expenses={expenses}
            staffList={staffList}
            workflows={workflows}
          />

        </main>
      )}


      {/* ----------------------------------------------------
          REPORT EXPORT PANEL DIALOG
         ---------------------------------------------------- */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1F356B] border border-blue-900/35 rounded-3xl p-6 w-full max-w-md shadow-2xl relative"
            >
              <button 
                onClick={() => setShowExportModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wide flex items-center gap-2">
                <Download className="w-4 h-4" />
                Compile Professional Firm Report
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">Export high-resolution accounting firm performance portfolios for compliance reviews and audits.</p>

              {exportProgress >= 0 ? (
                // Downloading Progress view
                <div className="py-10 space-y-4">
                  <div className="flex justify-between text-xs font-semibold text-slate-300">
                    <span>Compiling digital ledger...</span>
                    <span className="font-mono text-[#D4AF37]">{exportProgress}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-950/40 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#D4AF37] to-emerald-400" style={{ width: `${exportProgress}%` }}></div>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    {exportProgress < 40 ? "Assembling client records..." : exportProgress < 85 ? "Formatting ledger balances & tax categories..." : "Securing high-resolution report certification..."}
                  </p>
                </div>
              ) : (
                // Setup Form View
                <div className="space-y-4 pt-4">
                  
                  {/* Select Columns/Modules */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Select Modules</span>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(exportModules).map(([mod, checked]) => (
                        <label 
                          key={mod} 
                          className="flex items-center gap-2 bg-blue-950/15 p-2 rounded-xl border border-blue-950/35 text-[11px] cursor-pointer"
                        >
                          <input 
                            type="checkbox" 
                            checked={checked}
                            onChange={() => setExportModules(p => ({ ...p, [mod]: !checked }))}
                            className="rounded border-slate-600 bg-slate-950 text-[#D4AF37]"
                          />
                          <span className="capitalize text-slate-300">{mod.replace("Logs", " Logs")}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Export format select */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Choose Export Format</span>
                    <div className="flex gap-2">
                      {["PDF", "XLSX", "CSV", "PRINT"].map(fmt => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setExportFormat(fmt as any)}
                          className={`flex-1 text-center py-2 text-xs font-bold rounded-lg border cursor-pointer transition-all ${exportFormat === fmt ? "bg-[#0D2C6C] text-[#D4AF37] border-[#D4AF37]/35" : "bg-blue-950/10 border-blue-950/40 text-slate-400 hover:text-white"}`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowExportModal(false)}
                      className="flex-1 py-2.5 border border-blue-950/50 rounded-xl text-xs font-semibold text-slate-400 hover:bg-blue-950/20 cursor-pointer"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={handleStartExport}
                      className="flex-1 py-2.5 bg-[#D4AF37] hover:bg-[#AA8417] rounded-xl text-xs font-bold text-[#152952] cursor-pointer"
                    >
                      Export Portfolio
                    </button>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>


      {/* ----------------------------------------------------
          SEARCH RESULT DETAIL OVERLAY MODAL
         ---------------------------------------------------- */}
      <AnimatePresence>
        {selectedSearchResult && (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1F356B] border border-blue-900/35 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedSearchResult(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="border-b border-blue-950/45 pb-3 mb-4">
                <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest block font-mono">
                  {selectedSearchResult.type.toUpperCase()} METADATA FILE
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {selectedSearchResult.type === "client" && selectedSearchResult.data.name}
                  {selectedSearchResult.type === "case" && selectedSearchResult.data.serviceName}
                  {selectedSearchResult.type === "invoice" && selectedSearchResult.data.id}
                  {selectedSearchResult.type === "staff" && selectedSearchResult.data.name}
                </h3>
              </div>

              {/* Client Detail */}
              {selectedSearchResult.type === "client" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/20 p-3.5 rounded-2xl border border-blue-950/25">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Client ID</span>
                      <span className="text-white font-bold font-mono block mt-0.5">{selectedSearchResult.data.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Category</span>
                      <span className="text-white font-bold block mt-0.5">{selectedSearchResult.data.category}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Trade Name:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.tradeName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">GSTIN:</span>
                      <span className="font-mono font-semibold text-white">{selectedSearchResult.data.gstin || "Unregistered"}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">PAN:</span>
                      <span className="font-mono font-semibold text-white">{selectedSearchResult.data.pan || "N/A"}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Primary Contact:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.mobile}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Secure Email:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Filing Status:</span>
                      <span className="font-bold text-emerald-400 uppercase">{selectedSearchResult.data.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Case Detail */}
              {selectedSearchResult.type === "case" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/20 p-3.5 rounded-2xl border border-blue-950/25">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Case Number</span>
                      <span className="text-white font-bold font-mono block mt-0.5">{selectedSearchResult.data.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Case Status</span>
                      <span className="text-[#D4AF37] font-bold block mt-0.5 uppercase">{selectedSearchResult.data.status}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Billed Client:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.clientName}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Priority Level:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.priority}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Created Date:</span>
                      <span className="font-mono text-white">{selectedSearchResult.data.createdAt.substring(0,10)}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Expected Completion:</span>
                      <span className="font-mono font-semibold text-white">{selectedSearchResult.data.expectedCompletionDate || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Completed Date:</span>
                      <span className="font-mono font-semibold text-emerald-400">{selectedSearchResult.data.completedDate || "Active Under Processing"}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Detail */}
              {selectedSearchResult.type === "invoice" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/20 p-3.5 rounded-2xl border border-blue-950/25">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Invoice ID</span>
                      <span className="text-white font-bold font-mono block mt-0.5">{selectedSearchResult.data.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Grand Total Billed</span>
                      <span className="text-emerald-400 font-bold block mt-0.5 font-mono">₹{selectedSearchResult.data.grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Client Name:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.clientName}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Service Billed:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.serviceName}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Invoice Date:</span>
                      <span className="font-mono text-white">{selectedSearchResult.data.date}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Due Date:</span>
                      <span className="font-mono text-white">{selectedSearchResult.data.dueDate}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Invoice Status:</span>
                      <span className="font-bold uppercase text-[#D4AF37]">{selectedSearchResult.data.status}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Staff Detail */}
              {selectedSearchResult.type === "staff" && (
                <div className="space-y-3.5 text-xs text-slate-300">
                  <div className="grid grid-cols-2 gap-4 bg-slate-950/20 p-3.5 rounded-2xl border border-blue-950/25">
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">User Profile ID</span>
                      <span className="text-white font-bold font-mono block mt-0.5">{selectedSearchResult.data.id}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block">Role Definition</span>
                      <span className="text-white font-bold block mt-0.5">{selectedSearchResult.data.role === "OWNER" ? "SuperAdmin" : selectedSearchResult.data.role}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Authorized Name:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.name}</span>
                    </div>
                    <div className="flex justify-between border-b border-blue-950/15 pb-1.5">
                      <span className="text-slate-400">Active Profile Email:</span>
                      <span className="font-semibold text-white">{selectedSearchResult.data.email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">System Status:</span>
                      <span className="font-bold text-emerald-400 uppercase">{selectedSearchResult.data.status}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-blue-950/45 mt-4">
                <button
                  type="button"
                  onClick={() => setSelectedSearchResult(null)}
                  className="px-4 py-2 border border-blue-950/50 hover:bg-blue-950/20 rounded-xl text-xs font-semibold text-slate-400 cursor-pointer"
                >
                  Close Metadata File
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
