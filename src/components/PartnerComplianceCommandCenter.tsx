/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  FileCheck, ShieldAlert, Sparkles, TrendingUp, Users, CalendarDays, 
  AlertOctagon, CheckCircle2, RefreshCw, BarChart3, ShieldCheck
} from "lucide-react";
import { ComplianceAnalyticsService } from "../lib/complianceAnalyticsService";
import { ComplianceStatistics, ComplianceRiskAnalysis } from "../types/compliance";
import { User } from "../types";

interface PartnerComplianceCommandCenterProps {
  currentUser: User;
  onNavigateToRegister: () => void;
}

export default function PartnerComplianceCommandCenter({ currentUser, onNavigateToRegister }: PartnerComplianceCommandCenterProps) {
  const [filterFY, setFilterFY] = useState("2026-27");
  const [filterCategory, setFilterCategory] = useState("ALL");
  const [stats, setStats] = useState<ComplianceStatistics | null>(null);
  const [risks, setRisks] = useState<ComplianceRiskAnalysis[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

  useEffect(() => {
    loadAnalytics();
  }, [filterFY, filterCategory]);

  const loadAnalytics = () => {
    const s = ComplianceAnalyticsService.calculateStatistics(filterFY, filterCategory);
    const r = ComplianceAnalyticsService.getRiskAnalysis();
    const ai = ComplianceAnalyticsService.getAISuggestions();
    setStats(s);
    setRisks(r);
    setAiSuggestions(ai);
  };

  if (!stats) return null;

  return (
    <div className="space-y-6 text-slate-800">
      
      {/* Header */}
      <div className="bg-[#0D2C6C] p-6 rounded-3xl text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-widest block">Executive Partner Console</span>
          <h2 className="text-xl font-display font-black text-white mt-1 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
            Compliance Command Center & Risk Analytics
          </h2>
          <p className="text-xs text-blue-200 mt-1 max-w-xl">
            Real-time compliance KPIs, risk exposure meters, and statutory deadline tracking across the CA practice.
          </p>
        </div>

        <div className="flex gap-2">
          <select
            value={filterFY}
            onChange={(e) => setFilterFY(e.target.value)}
            className="px-3 py-2 bg-white/10 border border-white/20 text-white rounded-xl font-mono font-bold text-xs focus:outline-none"
          >
            <option value="2026-27" className="text-slate-800">FY 2026-27</option>
            <option value="2025-26" className="text-slate-800">FY 2025-26</option>
            <option value="ALL" className="text-slate-800">All FY</option>
          </select>

          <button
            type="button"
            onClick={onNavigateToRegister}
            className="px-4 py-2 bg-[#D4AF37] hover:bg-amber-500 text-[#0D2C6C] font-extrabold rounded-xl text-xs shadow cursor-pointer"
          >
            Open Compliance Register
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-xs">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Active Clients</span>
          <span className="text-2xl font-black text-[#0D2C6C] font-sans block">{stats.applicableClients}</span>
          <span className="text-[9px] text-slate-400 block">Practice master directory</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Filings</span>
          <span className="text-2xl font-black text-slate-800 font-sans block">{stats.totalRecords}</span>
          <span className="text-[9px] text-slate-400 block">Statutory return schedules</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Filed & Verified</span>
          <span className="text-2xl font-black text-emerald-600 font-sans block">{stats.filedCount}</span>
          <span className="text-[9px] text-emerald-600 font-semibold block">{stats.completionPercentage}% Completion</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Pending Returns</span>
          <span className="text-2xl font-black text-amber-600 font-sans block">{stats.pendingCount}</span>
          <span className="text-[9px] text-slate-400 block">Work in progress</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Due This Week</span>
          <span className="text-2xl font-black text-blue-600 font-sans block">{stats.dueThisWeekCount}</span>
          <span className="text-[9px] text-slate-400 block">Next 7 calendar days</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-100 bg-rose-50/30 shadow-sm space-y-1">
          <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wider block">Overdue Returns</span>
          <span className="text-2xl font-black text-rose-600 font-sans block">{stats.overdueCount}</span>
          <span className="text-[9px] text-rose-600 font-bold block">Requires Action</span>
        </div>
      </div>

      {/* Risk Score & AI Insights Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-xs">
        
        {/* Risk Score Card */}
        <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Firm Compliance Risk Exposure</span>
            <h3 className="text-lg font-bold text-slate-900 mt-1">Compliance Risk Score</h3>
          </div>

          <div className="text-center py-4 space-y-2">
            <div className="text-4xl font-black font-mono text-[#0D2C6C]">{stats.firmHealthScore} / 100</div>
            <span className="text-xs font-bold text-emerald-600 block">Firm Health Index</span>
            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  stats.firmHealthScore >= 80 ? "bg-emerald-500" :
                  stats.firmHealthScore >= 60 ? "bg-amber-500" : "bg-rose-500"
                }`}
                style={{ width: `${stats.firmHealthScore}%` }}
              />
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Risk score calculated dynamically based on overdue filings vs total compliance schedules.
          </p>
        </div>

        {/* AI Foundation Insights */}
        <div className="lg:col-span-8 bg-gradient-to-br from-slate-900 to-[#0D2C6C] p-6 rounded-3xl text-white shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="font-display font-bold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              AI Foundation Compliance Insights
            </h3>
            <span className="text-[9px] bg-white/10 text-[#D4AF37] px-2 py-0.5 rounded font-mono font-bold">STRUCTURED ENGINE</span>
          </div>

          <div className="space-y-3">
            {aiSuggestions.map((s, idx) => (
              <div key={idx} className="p-3 bg-white/10 border border-white/10 rounded-2xl text-xs text-blue-100 flex items-start gap-2.5">
                <span className="text-sm">💡</span>
                <span className="leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* High Risk Clients Table */}
      {risks.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4 text-xs">
          <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            High Risk Client Overdue Exposure ({risks.length} Clients)
          </h3>

          <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
            {risks.map((r, idx) => (
              <div key={idx} className="p-3.5 flex justify-between items-center hover:bg-slate-50">
                <div>
                  <span className="font-bold text-slate-900 block">{r.clientName}</span>
                  <span className="text-[10px] text-slate-400 font-mono">ID: {r.clientId}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
                    {r.riskFactor}
                  </span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                    r.riskLevel === "CRITICAL" ? "bg-rose-600 text-white" : "bg-amber-500 text-white"
                  }`}>
                    {r.riskLevel}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
