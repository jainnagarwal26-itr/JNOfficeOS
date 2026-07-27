/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileCheck, Search, Filter, RefreshCw, CheckCircle2, Clock, 
  AlertOctagon, Plus, Check, Eye, Tag, Calendar, ShieldCheck
} from "lucide-react";
import { ComplianceRegisterRecord, ComplianceStatus } from "../types/compliance";
import { ComplianceRepository } from "../lib/complianceRepository";
import { ComplianceRecurringEngine } from "../lib/complianceRecurringEngine";
import { User, UserRole } from "../types";
import MarkAsFiledDialog from "./MarkAsFiledDialog";
import { getClients } from "../lib/db";

interface ComplianceRegisterViewProps {
  currentUser: User;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function ComplianceRegisterView({ currentUser, onAddAuditLog }: ComplianceRegisterViewProps) {
  const [records, setRecords] = useState<ComplianceRegisterRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [fyFilter, setFyFilter] = useState<string>("2026-27");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const [selectedRecordForFiling, setSelectedRecordForFiling] = useState<ComplianceRegisterRecord | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, [fyFilter]);

  const loadData = () => {
    // Ensure recurring records exist
    ComplianceRecurringEngine.generateRecurringCompliances(fyFilter);
    const loaded = ComplianceRepository.getAllRecords();
    setRecords(loaded);
  };

  const handleGenerateRecurring = () => {
    setIsGenerating(true);
    const res = ComplianceRecurringEngine.generateRecurringCompliances(fyFilter);
    loadData();
    setIsGenerating(false);
    onAddAuditLog("COMPLIANCE_RECURRING_GENERATED", "DATABASE", `Generated ${res.generatedCount} statutory filing records for FY ${fyFilter}`);
    alert(`Generated ${res.generatedCount} statutory compliance records for FY ${fyFilter}.`);
  };

  const clients = getClients();

  // Filtered records
  const filteredRecords = records.filter(r => {
    if (fyFilter !== "ALL" && r.fy !== fyFilter) return false;
    if (categoryFilter !== "ALL" && r.category !== categoryFilter) return false;
    if (statusFilter !== "ALL" && r.status !== statusFilter) return false;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const clientObj = clients.find(c => c.id === r.clientId);
      const clientName = clientObj ? clientObj.name.toLowerCase() : "";
      return (
        r.complianceName.toLowerCase().includes(q) ||
        r.complianceCode.toLowerCase().includes(q) ||
        (r.ackNumber || "").toLowerCase().includes(q) ||
        clientName.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Top Banner Header */}
      <div className="bg-[#0D2C6C] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block">Enterprise Statutory Compliance Register</span>
          <h2 className="text-xl font-display font-black text-white mt-1 flex items-center gap-2">
            <FileCheck className="w-6 h-6 text-[#D4AF37]" />
            Permanent Statutory Filing Register (Storage-Optimized)
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Single source of truth for Income Tax, GST, TDS, ROC, and Statutory Audit filings across all practice clients.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerateRecurring}
            disabled={isGenerating}
            className="px-4 py-2.5 bg-[#D4AF37] hover:bg-amber-500 text-[#0D2C6C] font-extrabold rounded-xl text-xs shadow transition-all cursor-pointer flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isGenerating ? "animate-spin" : ""}`} />
            Sync Recurring Schedules (FY {fyFilter})
          </button>
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap justify-between items-center gap-3 text-xs">
        
        <div className="flex flex-wrap items-center gap-2 flex-grow max-w-2xl">
          <div className="relative flex-grow min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by client name, compliance type, or Ack No..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#0D2C6C]"
            />
          </div>

          <select
            value={fyFilter}
            onChange={(e) => setFyFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 focus:outline-none"
          >
            <option value="2026-27">FY 2026-27</option>
            <option value="2025-26">FY 2025-26</option>
            <option value="2024-25">FY 2024-25</option>
            <option value="ALL">All FY</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Core Categories</option>
            <option value="DIRECT_TAX">Income Tax & TDS</option>
            <option value="INDIRECT_TAX">GST Returns</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="OVERDUE">Overdue</option>
            <option value="FILED">Filed</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>

        <span className="text-[11px] font-bold font-mono text-slate-500">
          Showing {filteredRecords.length} Records
        </span>

      </div>

      {/* Main Register Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-xs">
        {filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-400 italic space-y-2">
            <FileCheck className="w-10 h-10 text-slate-300 mx-auto" />
            <p>No statutory compliance records match the selected filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                  <th className="p-4">Client Name</th>
                  <th className="p-4">Compliance Type</th>
                  <th className="p-4">Period / FY</th>
                  <th className="p-4">Due Date</th>
                  <th className="p-4">Filing Status</th>
                  <th className="p-4">Ack No / Filed Date</th>
                  <th className="p-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRecords.map((r) => {
                  const clientObj = clients.find(c => c.id === r.clientId);
                  const isFiled = ["FILED", "VERIFIED", "COMPLETED"].includes(r.status);
                  const isOverdue = r.status === "OVERDUE";

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-4 font-bold text-slate-900">
                        {clientObj ? clientObj.name : "Unknown Client"}
                        <span className="block text-[10px] font-mono font-normal text-slate-400">{r.clientId}</span>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-[#0D2C6C] block">{r.complianceName}</span>
                        <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono uppercase">{r.category}</span>
                      </td>

                      <td className="p-4">
                        <span className="font-semibold text-slate-700 block">{r.period}</span>
                        <span className="text-[10px] font-mono text-slate-400">FY {r.fy} (AY {r.ay})</span>
                      </td>

                      <td className="p-4 font-mono font-bold text-slate-700">
                        {r.dueDate}
                      </td>

                      <td className="p-4">
                        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider inline-block ${
                          isFiled ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                          isOverdue ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse" :
                          "bg-amber-100 text-amber-800 border border-amber-300"
                        }`}>
                          ● {r.status}
                        </span>
                      </td>

                      <td className="p-4">
                        {isFiled ? (
                          <div>
                            <span className="font-mono font-bold text-emerald-700 block text-[11px]">{r.ackNumber || "N/A"}</span>
                            <span className="text-[10px] text-slate-400 font-mono">Filed on {r.filedDate}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Not filed yet</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {!isFiled ? (
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForFiling(r)}
                            className="px-3 py-1.5 bg-[#0D2C6C] hover:bg-blue-900 text-white font-bold text-[11px] rounded-xl shadow cursor-pointer flex items-center gap-1 ml-auto"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            Mark as Filed
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setSelectedRecordForFiling(r)}
                            className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 text-slate-600 font-semibold text-[11px] rounded-lg cursor-pointer ml-auto"
                          >
                            View Details
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
            loadData();
          }}
        />
      )}

    </div>
  );
}
