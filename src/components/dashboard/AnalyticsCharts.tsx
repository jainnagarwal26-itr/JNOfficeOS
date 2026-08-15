/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  BarChart3, TrendingUp, Users, PieChart, Landmark, ArrowUpRight, 
  ArrowDownRight, Star, Award, ShieldAlert, CheckCircle2 
} from "lucide-react";
import { Client, Case, User, ActiveWorkflow } from "../../types";
import { Invoice } from "../../lib/financialRepository";
import { Expense } from "../../lib/expenseRepository";

interface AnalyticsChartsProps {
  clients: Client[];
  cases: Case[];
  invoices: Invoice[];
  expenses: Expense[];
  staffList: User[];
  workflows: ActiveWorkflow[];
}

export default function AnalyticsCharts({ 
  clients, 
  cases, 
  invoices, 
  expenses, 
  staffList, 
  workflows 
}: AnalyticsChartsProps) {
  
  const [activeTab, setActiveTab] = useState<"financial" | "operations" | "distribution" | "rankings">("financial");

  // ----------------------------------------------------
  // PREPARE REAL-TIME DATA
  // ----------------------------------------------------
  
  // A. FINANCIAL ANALYTICS
  // 1. Revenue by Month (Invoice Grand Total grouped by YYYY-MM)
  // Let's gather last 6 months
  const months = ["2026-02", "2026-03", "2026-04", "2026-05", "2026-06", "2026-07"];
  const revenueByMonthData = months.map(m => {
    const rev = invoices
      .filter(inv => inv.date.startsWith(m) && inv.status !== "Cancelled")
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
    const exp = expenses
      .filter(ex => ex.date.startsWith(m))
      .reduce((sum, ex) => sum + ex.amount, 0);
    return { month: m, revenue: rev, expenses: exp };
  });

  // 2. Daily Collections (Last 7 days collections)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split("T")[0];
  }).reverse();

  const dailyCollectionsData = last7Days.map(date => {
    const amt = invoices
      .flatMap(inv => inv.payments || [])
      .filter(p => p.date === date)
      .reduce((sum, p) => sum + p.amount, 0);
    return { date, amount: amt };
  });

  // 3. Monthly Collections (Same months)
  const monthlyCollectionsData = months.map(m => {
    const amt = invoices
      .flatMap(inv => inv.payments || [])
      .filter(p => p.date.startsWith(m))
      .reduce((sum, p) => sum + p.amount, 0);
    return { month: m, amount: amt };
  });

  // 4. Financial Year Trend (Accumulated monthly values)
  let runningRev = 0;
  let runningExp = 0;
  const fyTrendData = months.map(m => {
    const rev = invoices
      .filter(inv => inv.date.startsWith(m) && inv.status !== "Cancelled")
      .reduce((sum, inv) => sum + inv.grandTotal, 0);
    const exp = expenses
      .filter(ex => ex.date.startsWith(m))
      .reduce((sum, ex) => sum + ex.amount, 0);
    runningRev += rev;
    runningExp += exp;
    return { month: m, revenue: runningRev, expenses: runningExp, margin: runningRev - runningExp };
  });


  // B. OPERATIONS & CASES
  // 5. Case Status Distribution
  const caseStatuses = ["Draft", "Assigned", "Documents Pending", "Ready", "Work Started", "Under Processing", "Filed", "Completed", "Cancelled", "On Hold"];
  const statusCounts = caseStatuses.map(status => ({
    status,
    count: cases.filter(c => c.status === status).length
  })).filter(x => x.count > 0);

  // 6. Case Priority Distribution
  const priorities: Case["priority"][] = ["Low", "Medium", "High", "Critical"];
  const priorityCounts = priorities.map(priority => ({
    priority,
    count: cases.filter(c => c.priority === priority).length
  }));

  // 7. Payment Status Count
  const paymentStatuses = ["Unpaid", "Partially Paid", "Paid", "Cancelled"];
  const paymentStatusCounts = paymentStatuses.map(status => ({
    status,
    count: invoices.filter(inv => inv.status === status).length
  }));


  // C. REVENUE DISTRIBUTIONS
  // 8. Revenue by Service
  const revenueByServiceMap: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.status === "Cancelled") return;
    revenueByServiceMap[inv.serviceName] = (revenueByServiceMap[inv.serviceName] || 0) + inv.grandTotal;
  });
  const revenueByServiceData = Object.entries(revenueByServiceMap).map(([service, rev]) => ({
    service,
    revenue: rev
  })).sort((a, b) => b.revenue - a.revenue);

  // 9. Revenue by Staff
  const revenueByStaffMap: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.status === "Cancelled") return;
    // Map to assigned staff names
    inv.assignedStaffIds.forEach(id => {
      const staff = staffList.find(s => s.id === id);
      const name = staff ? staff.name.split(" ")[0] : "Admin";
      revenueByStaffMap[name] = (revenueByStaffMap[name] || 0) + (inv.grandTotal / inv.assignedStaffIds.length);
    });
    if (inv.assignedStaffIds.length === 0) {
      revenueByStaffMap["Owner/Unassigned"] = (revenueByStaffMap["Owner/Unassigned"] || 0) + inv.grandTotal;
    }
  });
  const revenueByStaffData = Object.entries(revenueByStaffMap).map(([staff, rev]) => ({
    staff,
    revenue: rev
  }));

  // 10. Revenue by Client Category
  const categoryRevMap: Record<string, number> = {};
  invoices.forEach(inv => {
    if (inv.status === "Cancelled") return;
    const client = clients.find(c => c.id === inv.clientId);
    const cat = client ? client.category : "Individual";
    categoryRevMap[cat] = (categoryRevMap[cat] || 0) + inv.grandTotal;
  });
  const categoryRevData = Object.entries(categoryRevMap).map(([category, rev]) => ({
    category,
    revenue: rev
  }));

  // 11. Outstanding Aging Buckets
  let aging_30 = 0, aging_60 = 0, aging_90 = 0, aging_90_plus = 0;
  const today = new Date();
  invoices.forEach(inv => {
    if (inv.status === "Paid" || inv.status === "Cancelled") return;
    const paid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
    const unpaid = inv.grandTotal - paid;
    if (unpaid <= 0) return;

    const dueDate = new Date(inv.dueDate);
    const diffDays = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays <= 0) return; // not due yet
    if (diffDays <= 30) aging_30 += unpaid;
    else if (diffDays <= 60) aging_60 += unpaid;
    else if (diffDays <= 90) aging_90 += unpaid;
    else aging_90_plus += unpaid;
  });
  const outstandingAgingData = [
    { range: "1-30 Days Due", value: aging_30, color: "bg-indigo-500" },
    { range: "31-60 Days Overdue", value: aging_60, color: "bg-amber-500" },
    { range: "61-90 Days Overdue", value: aging_90, color: "bg-orange-500" },
    { range: "90+ Days Overdue", value: aging_90_plus, color: "bg-rose-500" }
  ];


  // D. RANKINGS & VOLUME
  // 12. Top 10 Clients by Revenue
  const clientRevMap: Record<string, { name: string, total: number }> = {};
  invoices.forEach(inv => {
    if (inv.status === "Cancelled") return;
    if (!clientRevMap[inv.clientId]) {
      clientRevMap[inv.clientId] = { name: inv.clientName, total: 0 };
    }
    clientRevMap[inv.clientId].total += inv.grandTotal;
  });
  const topClientsData = Object.values(clientRevMap)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  // 13. Top 10 Services (by invoice volume/frequency)
  const serviceCountMap: Record<string, { name: string, count: number }> = {};
  invoices.forEach(inv => {
    if (inv.status === "Cancelled") return;
    if (!serviceCountMap[inv.serviceName]) {
      serviceCountMap[inv.serviceName] = { name: inv.serviceName, count: 0 };
    }
    serviceCountMap[inv.serviceName].count += 1;
  });
  const topServicesData = Object.values(serviceCountMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 14. Compliance Category Distribution (Active Workflows grouped by service category)
  const complianceMap: Record<string, number> = {};
  workflows.forEach(wf => {
    const category = wf.serviceCode.split("-")[0] || "Other";
    complianceMap[category] = (complianceMap[category] || 0) + 1;
  });
  const complianceCategoryData = Object.entries(complianceMap).map(([category, count]) => ({
    category,
    count
  }));

  // 15. Staff Productivity (Assigned cases vs Completed cases count)
  const staffProductivityData = staffList
    .filter(s => s.role === "STAFF")
    .map(staff => {
      const assigned = cases.filter(c => c.assignedStaffIds.includes(staff.id)).length;
      const completed = cases.filter(c => c.assignedStaffIds.includes(staff.id) && c.status === "Completed").length;
      const rate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;
      return { name: staff.name.split(" ")[0], assigned, completed, rate };
    });

  // Helper to find max value in numeric array for custom scales
  const getMaxVal = (arr: number[]) => Math.max(...arr, 1);

  return (
    <div className="bg-[#1F356B] border border-blue-900/35 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      
      {/* Visual Analytics Menu */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-blue-950/40 pb-4 gap-3 sm:gap-4">
        <div>
          <h2 className="text-xs sm:text-sm font-semibold tracking-wide text-[#D4AF37] uppercase">Visual Analytics & Business Intelligence</h2>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Real-time analytical representation of your accounting firm practice metrics</p>
        </div>
        
        <div className="flex flex-wrap bg-blue-950/40 p-1 rounded-xl border border-blue-950/50 gap-1 max-w-full">
          {[
            { id: "financial", label: "Financials", icon: Landmark },
            { id: "operations", label: "Operations", icon: BarChart3 },
            { id: "distribution", label: "Revenue Split", icon: PieChart },
            { id: "rankings", label: "Rankings & Staff", icon: Users }
          ].map(t => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as any)}
                className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold cursor-pointer transition-colors ${activeTab === t.id ? "bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]" : "text-slate-400 hover:text-white"}`}
              >
                <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Render Dynamic Charts depending on Active tab */}
      {activeTab === "financial" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          
          {/* Chart 1: Revenue & Expense Trend (Bar + Trend Line) */}
          <div className="bg-[#061026] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-950/30 overflow-hidden">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Revenue by Month vs Expenses</span>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="h-44 min-w-[260px] flex items-end justify-between gap-1.5 sm:gap-3 px-1 border-b border-blue-950/50 pb-2 relative">
                {revenueByMonthData.map((d, idx) => {
                  const maxVal = getMaxVal([...revenueByMonthData.map(x => x.revenue), ...revenueByMonthData.map(x => x.expenses)]);
                  const revHeight = (d.revenue / maxVal) * 100;
                  const expHeight = (d.expenses / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex justify-center items-end gap-1 sm:gap-1.5 h-full relative group">
                      {/* Revenue Bar */}
                      <div 
                        className="w-2.5 sm:w-4 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-sm transition-all duration-500 group-hover:brightness-110 relative"
                        style={{ height: `${Math.max(revHeight, 3)}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-emerald-500/25 text-[9px] font-mono font-bold text-emerald-400 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                          ₹{Math.round(d.revenue/1000)}k
                        </div>
                      </div>
                      {/* Expense Bar */}
                      <div 
                        className="w-2.5 sm:w-4 bg-gradient-to-t from-rose-600 to-rose-400 rounded-t-sm transition-all duration-500 group-hover:brightness-110 relative"
                        style={{ height: `${Math.max(expHeight, 3)}%` }}
                      >
                        <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-rose-500/25 text-[9px] font-mono font-bold text-rose-400 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30">
                          ₹{Math.round(d.expenses/1000)}k
                        </div>
                      </div>
                      {/* Tooltip Overlay */}
                      <div className="absolute bottom-0 text-[9px] sm:text-[10px] font-semibold text-slate-400 transform translate-y-6 whitespace-nowrap">
                        {d.month.split("-")[1] === "07" ? "Jul" : d.month.split("-")[1] === "06" ? "Jun" : d.month.split("-")[1] === "05" ? "May" : d.month.split("-")[1] === "04" ? "Apr" : d.month.split("-")[1] === "03" ? "Mar" : "Feb"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-7 text-[9px] sm:text-[10px] font-semibold">
              <div className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-emerald-500 rounded-sm"></span><span className="text-slate-300">Revenue Billed</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-rose-500 rounded-sm"></span><span className="text-slate-300">Logged Expenses</span></div>
            </div>
          </div>

          {/* Chart 2: Financial Year Trend (Accumulated Net Revenue Surplus) */}
          <div className="bg-[#061026] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-950/30 overflow-hidden">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Financial Year Profit Trend (Cumulative)</span>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="h-44 min-w-[260px] flex items-end justify-between px-2 border-b border-blue-950/50 pb-2 relative">
                {fyTrendData.map((d, idx) => {
                  const maxVal = getMaxVal(fyTrendData.map(x => x.revenue));
                  const heightPercent = (d.revenue / maxVal) * 100;
                  const marginPercent = ((d.revenue - d.expenses) / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-grow flex flex-col justify-end items-center h-full relative group">
                      {/* Cumulative Revenue Line representation */}
                      <div className="w-2.5 sm:w-3 bg-[#D4AF37] rounded-t-sm" style={{ height: `${heightPercent}%` }}></div>
                      {/* Cumulative Profit margin representation */}
                      <div className="w-1 sm:w-1.5 bg-cyan-400 absolute rounded-t-sm" style={{ height: `${marginPercent}%`, bottom: 0 }}></div>
                      
                      <div className="absolute -top-7 bg-slate-900 text-[9px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        Margin: ₹{Math.round(d.margin/1000)}k
                      </div>
                      
                      <div className="absolute bottom-0 text-[9px] sm:text-[10px] font-semibold text-slate-400 transform translate-y-6">
                        {d.month.split("-")[1] === "07" ? "Jul" : d.month.split("-")[1] === "06" ? "Jun" : d.month.split("-")[1] === "05" ? "May" : d.month.split("-")[1] === "04" ? "Apr" : d.month.split("-")[1] === "03" ? "Mar" : "Feb"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-3 sm:gap-4 mt-7 text-[9px] sm:text-[10px] font-semibold">
              <div className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-[#D4AF37] rounded-sm"></span><span className="text-slate-300">Cumulative Revenue</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 sm:w-2.5 sm:h-2.5 bg-cyan-400 rounded-sm"></span><span className="text-slate-300">Net Profit Margin</span></div>
            </div>
          </div>

          {/* Chart 3: Daily Collections Trajectory */}
          <div className="bg-[#061026] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-950/30 overflow-hidden">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Daily Collections (Last 7 Days)</span>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="h-44 min-w-[260px] flex items-end justify-between px-1 border-b border-blue-950/50 pb-2 relative">
                {dailyCollectionsData.map((d, idx) => {
                  const maxVal = getMaxVal(dailyCollectionsData.map(x => x.amount));
                  const heightPercent = (d.amount / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center h-full relative group">
                      <div 
                        className="w-4 sm:w-6 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t"
                        style={{ height: `${Math.max(heightPercent, 2)}%` }}
                      ></div>
                      <div className="absolute -top-7 bg-slate-900 border border-teal-500/30 text-[9px] font-mono text-teal-400 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        ₹{d.amount.toLocaleString("en-IN")}
                      </div>
                      <div className="absolute bottom-0 text-[8px] font-semibold text-slate-400 transform translate-y-6 select-none whitespace-nowrap">
                        {d.date.substring(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-center mt-7 text-[9px] sm:text-[10px] text-slate-400 text-center">
              Shows payment receipts captured day-by-day across all bank and UPI channels
            </div>
          </div>

          {/* Chart 4: Monthly Collections Volume */}
          <div className="bg-[#061026] p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-blue-950/30 overflow-hidden">
            <span className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Monthly Collections (Inflow Volume)</span>
            <div className="w-full overflow-x-auto scrollbar-none pb-2">
              <div className="h-44 min-w-[260px] flex items-end justify-between px-2 border-b border-blue-950/50 pb-2 relative">
                {monthlyCollectionsData.map((d, idx) => {
                  const maxVal = getMaxVal(monthlyCollectionsData.map(x => x.amount));
                  const heightPercent = (d.amount / maxVal) * 100;
                  return (
                    <div key={idx} className="flex-grow flex flex-col justify-end items-center h-full relative group">
                      <div 
                        className="w-5 sm:w-8 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t"
                        style={{ height: `${Math.max(heightPercent, 3)}%` }}
                      ></div>
                      <div className="absolute -top-7 bg-slate-900 border border-cyan-500/30 text-[9px] font-mono text-cyan-300 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity z-10 whitespace-nowrap">
                        ₹{Math.round(d.amount/1000)}k
                      </div>
                      <div className="absolute bottom-0 text-[9px] sm:text-[10px] font-semibold text-slate-400 transform translate-y-6">
                        {d.month.split("-")[1] === "07" ? "Jul" : d.month.split("-")[1] === "06" ? "Jun" : d.month.split("-")[1] === "05" ? "May" : d.month.split("-")[1] === "04" ? "Apr" : d.month.split("-")[1] === "03" ? "Mar" : "Feb"}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="flex justify-center mt-7 text-[9px] sm:text-[10px] text-slate-400 text-center">
              Sum of actual client invoice receipts settled within respective monthly calendar windows
            </div>
          </div>
        </div>
      )}

      {activeTab === "operations" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Chart 5: Case Status Distribution */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Case Status Distribution</span>
              <div className="space-y-2.5">
                {statusCounts.map((s, idx) => {
                  const total = cases.length || 1;
                  const percent = Math.round((s.count / total) * 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-medium text-slate-300">
                        <span>{s.status}</span>
                        <span className="font-mono text-slate-400">{s.count} Cases ({percent}%)</span>
                      </div>
                      <div className="h-1.5 w-full bg-blue-950/50 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-4 border-t border-blue-950/40 pt-2 text-center">
              Active case volume tracking by current processing lifecycle stages
            </div>
          </div>

          {/* Chart 6: Case Priority Distribution */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Case Priority Distribution</span>
              <div className="space-y-3.5 mt-2">
                {priorityCounts.map((p, idx) => {
                  const total = cases.length || 1;
                  const percent = Math.round((p.count / total) * 100);
                  const color = p.priority === "Critical" ? "from-rose-600 to-rose-400" : p.priority === "High" ? "from-orange-500 to-amber-500" : p.priority === "Medium" ? "from-indigo-500 to-blue-500" : "from-emerald-500 to-teal-500";
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${p.priority === "Critical" ? "bg-rose-500 animate-pulse" : p.priority === "High" ? "bg-orange-500" : p.priority === "Medium" ? "bg-indigo-500" : "bg-emerald-500"}`}></span>
                          {p.priority} Priority
                        </span>
                        <span className="font-mono text-slate-400">{p.count} Cases ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-blue-950/50 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-4 border-t border-blue-950/40 pt-2 text-center">
              Critically focused representation of client cases by immediate operational urgency
            </div>
          </div>

          {/* Chart 7: Payment Statuses */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Invoice Payment Settlement Status</span>
              <div className="space-y-3.5 mt-2">
                {paymentStatusCounts.map((ps, idx) => {
                  const total = invoices.length || 1;
                  const percent = Math.round((ps.count / total) * 100);
                  const color = ps.status === "Paid" ? "from-emerald-500 to-emerald-400" : ps.status === "Unpaid" ? "from-rose-600 to-rose-500" : ps.status === "Partially Paid" ? "from-amber-500 to-amber-400" : "from-slate-600 to-slate-400";
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                        <span>{ps.status}</span>
                        <span className="font-mono text-slate-400">{ps.count} Invoices ({percent}%)</span>
                      </div>
                      <div className="h-2 w-full bg-blue-950/50 rounded-full overflow-hidden">
                        <div className={`h-full bg-gradient-to-r ${color}`} style={{ width: `${percent}%` }}></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 mt-4 border-t border-blue-950/40 pt-2 text-center">
              Total billing outstanding classification by collection and payment statuses
            </div>
          </div>

        </div>
      )}

      {activeTab === "distribution" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 8: Revenue by Service */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Revenue Share by Service Catalog</span>
            <div className="space-y-3 h-52 overflow-y-auto pr-1">
              {revenueByServiceData.slice(0, 5).map((item, idx) => {
                const max = getMaxVal(revenueByServiceData.map(x => x.revenue));
                const barWidth = (item.revenue / max) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-slate-300">
                      <span className="truncate max-w-[240px]">{item.service}</span>
                      <span className="font-mono text-[#D4AF37]">₹{item.revenue.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-2 w-full bg-blue-950/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-[#D4AF37]" style={{ width: `${barWidth}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 9: Revenue by Staff */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Revenue Generated by Executive Staff (Share)</span>
            <div className="space-y-3 h-52 overflow-y-auto pr-1">
              {revenueByStaffData.map((item, idx) => {
                const max = getMaxVal(revenueByStaffData.map(x => x.revenue));
                const barWidth = (item.revenue / max) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[10px] font-medium text-slate-300">
                      <span>{item.staff}</span>
                      <span className="font-mono text-indigo-400">₹{item.revenue.toLocaleString("en-IN")}</span>
                    </div>
                    <div className="h-2 w-full bg-blue-950/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-indigo-600 to-purple-500" style={{ width: `${barWidth}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 10: Revenue by Client Category */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Revenue by Client Constitution / Legal Category</span>
            <div className="grid grid-cols-2 gap-4">
              {categoryRevData.slice(0, 4).map((item, idx) => {
                const total = categoryRevData.reduce((s, x) => s + x.revenue, 0) || 1;
                const percent = Math.round((item.revenue / total) * 100);
                return (
                  <div key={idx} className="bg-blue-950/20 p-3.5 rounded-xl border border-blue-950/45 flex flex-col justify-between">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide font-medium">{item.category}</span>
                    <div className="mt-2">
                      <span className="text-sm font-bold font-mono text-white block">₹{item.revenue.toLocaleString("en-IN")}</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block font-mono">{percent}% share of billings</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 11: Outstanding Aging */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Outstanding Billing Aging Report</span>
            <div className="space-y-3.5">
              {outstandingAgingData.map((item, idx) => {
                const total = outstandingAgingData.reduce((s, x) => s + x.value, 0) || 1;
                const percent = Math.round((item.value / total) * 100);
                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-24 text-[10px] font-medium text-slate-400 truncate">{item.range}</div>
                    <div className="flex-1 h-3 bg-blue-950/40 rounded overflow-hidden relative">
                      <div className={`h-full ${item.color}`} style={{ width: `${percent}%` }}></div>
                    </div>
                    <div className="w-20 text-right text-[10px] font-mono font-semibold text-slate-300">
                      ₹{item.value.toLocaleString("en-IN")} ({percent}%)
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {activeTab === "rankings" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Chart 12: Top 10 Clients by Revenue */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">Top Paying Clients Ledger</span>
            <div className="space-y-2 h-64 overflow-y-auto pr-1">
              {topClientsData.map((client, idx) => {
                return (
                  <div key={idx} className="flex items-center justify-between text-[11px] border-b border-blue-950/25 pb-1.5">
                    <span className="flex items-center gap-2 truncate max-w-[280px]">
                      <span className="text-[9px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-1 rounded font-mono">#{idx+1}</span>
                      <span className="truncate text-slate-300">{client.name}</span>
                    </span>
                    <span className="font-mono text-emerald-400 font-bold shrink-0 pl-2">₹{client.total.toLocaleString("en-IN")}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 13: Top 10 Services (High Frequency) */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-3">High-Frequency Professional Services</span>
            <div className="space-y-2 h-64 overflow-y-auto pr-1">
              {topServicesData.map((srv, idx) => {
                return (
                  <div key={idx} className="flex items-center justify-between text-[11px] border-b border-blue-950/25 pb-1.5">
                    <span className="flex items-center gap-2 truncate max-w-[280px]">
                      <span className="text-[9px] font-bold bg-blue-500/20 text-blue-400 px-1 rounded font-mono">#{idx+1}</span>
                      <span className="truncate text-slate-300">{srv.name}</span>
                    </span>
                    <span className="font-mono text-slate-400 shrink-0 font-semibold pl-2">{srv.count} filings</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 14: Compliance Category Distribution */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Compliance Workflows Category Split</span>
            <div className="space-y-3">
              {complianceCategoryData.map((wf, idx) => {
                const total = workflows.length || 1;
                const percent = Math.round((wf.count / total) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-[11px] font-medium text-slate-300">
                      <span>{wf.category} compliance</span>
                      <span className="font-mono text-slate-400">{wf.count} active ({percent}%)</span>
                    </div>
                    <div className="h-2 w-full bg-blue-950/40 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-teal-500 to-indigo-500" style={{ width: `${percent}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Chart 15: Staff Productivity (Assigned vs Completed) */}
          <div className="bg-[#061026] p-5 rounded-2xl border border-blue-950/30">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block mb-4">Executive Staff Case Resolution Productivity</span>
            <div className="space-y-3">
              {staffProductivityData.map((staff, idx) => {
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-[11px] font-semibold text-slate-300">
                      <span>{staff.name}</span>
                      <span className="text-[10px] text-emerald-400 font-mono">Productivity: {staff.rate}%</span>
                    </div>
                    <div className="flex gap-1.5 h-4 items-center">
                      <div className="flex-1 h-2.5 bg-blue-950/40 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full" style={{ width: `${staff.rate}%` }}></div>
                        <div className="bg-indigo-500 h-full" style={{ width: `${100 - staff.rate}%` }}></div>
                      </div>
                      <span className="text-[9px] font-mono text-slate-400 w-16 text-right shrink-0">
                        {staff.completed}/{staff.assigned} resolved
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
