/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileCheck, ShieldCheck, CheckCircle2, Clock, AlertOctagon, 
  Search, Calendar, Filter, Plus, FileText, ChevronRight, Tag, Activity
} from "lucide-react";
import { 
  ComplianceRegisterRecord, ITRFormType, GSTFormType, TDSFormType, ClientComplianceHealth 
} from "../types/compliance";
import { ComplianceRepository } from "../lib/complianceRepository";
import { ComplianceRecurringEngine } from "../lib/complianceRecurringEngine";
import { User, Client } from "../types";
import MarkAsFiledDialog from "./MarkAsFiledDialog";

interface ClientComplianceWorkspaceProps {
  client: Client;
  currentUser: User;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function ClientComplianceWorkspace({ client, currentUser, onAddAuditLog }: ClientComplianceWorkspaceProps) {
  const [activeCategory, setActiveCategory] = useState<"ITR" | "GST" | "TDS">("ITR");
  const [selectedITRForm, setSelectedITRForm] = useState<ITRFormType>("ITR-4");
  const [selectedGSTForm, setSelectedGSTForm] = useState<GSTFormType>("GSTR-3B");
  const [selectedTDSForm, setSelectedTDSForm] = useState<TDSFormType>("26Q");

  const [records, setRecords] = useState<ComplianceRegisterRecord[]>([]);
  const [selectedRecordForFiling, setSelectedRecordForFiling] = useState<ComplianceRegisterRecord | null>(null);
  const [fyFilter, setFyFilter] = useState<string>("2026-27");

  useEffect(() => {
    loadClientData();
  }, [client.id, fyFilter]);

  const loadClientData = () => {
    ComplianceRecurringEngine.generateRecurringCompliances(fyFilter);
    const clientRecs = ComplianceRepository.getRecordsByClientId(client.id);
    setRecords(clientRecs);
  };

  // Calculate Health Score for this client (Income Tax, GST, TDS)
  const calculateClientHealth = (): ClientComplianceHealth => {
    const todayStr = new Date().toISOString().split("T")[0];
    const total = records.length;
    if (total === 0) {
      return { clientId: client.id, score: 100, status: "GREEN", completedCount: 0, pendingCount: 0, overdueCount: 0, dueSoonCount: 0 };
    }

    const completed = records.filter(r => ["FILED", "VERIFIED", "COMPLETED"].includes(r.status)).length;
    const pending = records.filter(r => ["NOT_STARTED", "IN_PROGRESS", "WAITING_CLIENT", "UNDER_REVIEW"].includes(r.status)).length;
    const overdue = records.filter(r => r.status === "OVERDUE" || (!["FILED", "VERIFIED", "COMPLETED", "CANCELLED"].includes(r.status) && r.dueDate < todayStr)).length;

    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split("T")[0];
    const dueSoon = records.filter(r => r.dueDate >= todayStr && r.dueDate <= next7DaysStr && !["FILED", "VERIFIED", "COMPLETED"].includes(r.status)).length;

    const score = Math.max(0, Math.round(((completed) / total) * 100));
    let status: "GREEN" | "YELLOW" | "RED" = "GREEN";
    if (score < 50 || overdue >= 3) status = "RED";
    else if (score < 80 || overdue >= 1) status = "YELLOW";

    return {
      clientId: client.id,
      score,
      status,
      completedCount: completed,
      pendingCount: pending,
      overdueCount: overdue,
      dueSoonCount: dueSoon
    };
  };

  const health = calculateClientHealth();

  // Filter records based on active category & form
  const getCategoryRecords = () => {
    if (activeCategory === "ITR") {
      return records.filter(r => r.category === "DIRECT_TAX" && r.complianceCode.startsWith("ITR"));
    } else if (activeCategory === "GST") {
      return records.filter(r => r.category === "INDIRECT_TAX" && (r.complianceCode.startsWith("GSTR") || r.complianceCode === "CMP_08"));
    } else {
      return records.filter(r => r.complianceCode.startsWith("TDS"));
    }
  };

  const currentCategoryRecords = getCategoryRecords();

  return (
    <div className="space-y-6 text-slate-800 text-xs">
      
      {/* CLIENT COMPLIANCE HEALTH CARD */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0D2C6C] to-slate-900 p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        <div className="space-y-1">
          <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block">Client Statutory Health Score</span>
          <h3 className="text-xl font-display font-black text-white flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            {client.name} Compliance Workspace
          </h3>
          <p className="text-xs text-blue-200 font-mono">
            Client ID: {client.id} • PAN: {client.pan || "N/A"} • GSTIN: {client.gstin || "N/A"}
          </p>
        </div>

        {/* Health Score Meter */}
        <div className="flex items-center gap-6 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
          <div className="text-center">
            <span className={`text-3xl font-black font-mono block ${
              health.status === "GREEN" ? "text-emerald-400" :
              health.status === "YELLOW" ? "text-amber-400" : "text-rose-400"
            }`}>
              {health.status === "GREEN" ? "🟢" : health.status === "YELLOW" ? "🟡" : "🔴"} {health.score}%
            </span>
            <span className="text-[9px] uppercase font-bold text-slate-300 tracking-wider">Compliance Index</span>
          </div>

          <div className="h-10 w-px bg-white/20" />

          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-semibold">
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Completed</span>
              <span className="text-emerald-400 font-bold">{health.completedCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Pending</span>
              <span className="text-amber-400 font-bold">{health.pendingCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Overdue</span>
              <span className="text-rose-400 font-bold">{health.overdueCount}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[9px] uppercase">Due Soon</span>
              <span className="text-blue-300 font-bold">{health.dueSoonCount}</span>
            </div>
          </div>
        </div>

      </div>

      {/* COMPLIANCE CATEGORY SWITCHER (INCOME TAX, GST, TDS) */}
      <div className="flex border-b border-slate-200 text-xs font-bold bg-white rounded-2xl p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => setActiveCategory("ITR")}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeCategory === "ITR" 
              ? "bg-[#0D2C6C] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <FileText className="w-4 h-4 text-[#D4AF37]" />
          Income Tax (ITR)
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("GST")}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeCategory === "GST" 
              ? "bg-[#0D2C6C] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          GST Returns
        </button>

        <button
          type="button"
          onClick={() => setActiveCategory("TDS")}
          className={`flex-1 py-3 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeCategory === "TDS" 
              ? "bg-[#0D2C6C] text-white shadow-md" 
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Tag className="w-4 h-4 text-amber-400" />
          TDS Quarterly
        </button>
      </div>

      {/* SUB-FORM / TYPE SELECTOR RIBBON */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
        
        {activeCategory === "ITR" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">ITR Form Type:</span>
            {(["ITR-1", "ITR-2", "ITR-3", "ITR-4", "ITR-5", "ITR-6", "ITR-7"] as ITRFormType[]).map(form => (
              <button
                type="button"
                key={form}
                onClick={() => setSelectedITRForm(form)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedITRForm === form 
                    ? "bg-[#0D2C6C] text-[#D4AF37] shadow" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {form}
              </button>
            ))}
          </div>
        )}

        {activeCategory === "GST" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">GST Form Type:</span>
            {(["GSTR-1", "GSTR-3B", "CMP-08", "GSTR-9"] as GSTFormType[]).map(form => (
              <button
                type="button"
                key={form}
                onClick={() => setSelectedGSTForm(form)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedGSTForm === form 
                    ? "bg-[#0D2C6C] text-emerald-400 shadow" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {form}
              </button>
            ))}
          </div>
        )}

        {activeCategory === "TDS" && (
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-2">TDS Form Type:</span>
            {(["24Q", "26Q", "27Q", "27EQ"] as TDSFormType[]).map(form => (
              <button
                type="button"
                key={form}
                onClick={() => setSelectedTDSForm(form)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all cursor-pointer ${
                  selectedTDSForm === form 
                    ? "bg-[#0D2C6C] text-amber-400 shadow" 
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                Form {form}
              </button>
            ))}
          </div>
        )}

        {/* Financial Year Selector */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">FY:</span>
          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="px-3 py-1.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-800 focus:outline-none"
          >
            <option value="2026-27">FY 2026-27</option>
            <option value="2025-26">FY 2025-26</option>
            <option value="2024-25">FY 2024-25</option>
          </select>
        </div>

      </div>

      {/* COMPLIANCE FILING HISTORY CARDS */}
      <div className="space-y-3">
        {currentCategoryRecords.length === 0 ? (
          <div className="bg-white p-8 rounded-3xl border border-slate-100 text-center text-slate-400 italic space-y-2">
            <FileCheck className="w-8 h-8 text-slate-300 mx-auto" />
            <p>No statutory records found for {activeCategory} in FY {fyFilter}.</p>
          </div>
        ) : (
          currentCategoryRecords.map((r) => {
            const isFiled = ["FILED", "VERIFIED", "COMPLETED"].includes(r.status);
            const isOverdue = r.status === "OVERDUE";

            return (
              <div key={r.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-slate-200 transition-all">
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#0D2C6C] text-sm">{r.complianceName}</span>
                    <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      isFiled ? "bg-emerald-100 text-emerald-800" :
                      isOverdue ? "bg-rose-100 text-rose-800 border border-rose-300" : "bg-amber-100 text-amber-800"
                    }`}>
                      ● {r.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono">
                    <span>Period: <strong className="text-slate-800 font-sans">{r.period}</strong></span>
                    <span>FY: <strong className="text-slate-800">{r.fy}</strong> (AY {r.ay})</span>
                    <span>Due Date: <strong className="text-slate-800">{r.dueDate}</strong></span>
                  </div>

                  {isFiled && (
                    <div className="pt-1 text-[11px] font-mono text-emerald-800 flex items-center gap-3">
                      <span>Ack No: <strong>{r.ackNumber || "N/A"}</strong></span>
                      <span>Filed Date: <strong>{r.filedDate}</strong></span>
                      {r.remarks && <span className="font-sans text-slate-600">({r.remarks})</span>}
                    </div>
                  )}
                </div>

                <div className="shrink-0">
                  {!isFiled ? (
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForFiling(r)}
                      className="px-4 py-2 bg-[#0D2C6C] hover:bg-blue-900 text-white font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Mark as Filed
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedRecordForFiling(r)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl cursor-pointer"
                    >
                      View Record
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* MARK AS FILED DIALOG */}
      {selectedRecordForFiling && (
        <MarkAsFiledDialog
          record={selectedRecordForFiling}
          currentUser={currentUser}
          onClose={() => setSelectedRecordForFiling(null)}
          onSuccess={() => {
            setSelectedRecordForFiling(null);
            loadClientData();
          }}
        />
      )}

    </div>
  );
}
