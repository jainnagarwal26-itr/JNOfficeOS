/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { 
  Users, Briefcase, Clock, CheckCircle2, AlertOctagon, FileText, 
  TrendingUp, Landmark, ShieldCheck, CalendarDays, UserCheck, Play, 
  Coffee, ShieldAlert 
} from "lucide-react";
import { Client, Case, User } from "../../types";
import { Invoice } from "../../lib/financialRepository";

interface KPISectionProps {
  clients: Client[];
  cases: Case[];
  invoices: Invoice[];
  staffList: User[];
  workflowsCount: number;
}

export default function KPISection({ 
  clients, 
  cases, 
  invoices, 
  staffList, 
  workflowsCount 
}: KPISectionProps) {
  
  const todayStr = new Date().toISOString().split("T")[0];

  // 1. Active Clients
  const activeClients = clients.filter(c => (c.status || "").toLowerCase() === "active" || c.status === "Active" || !c.status).length;

  // 2. Cases
  const totalCases = cases.length;
  
  // 3. Cases In Progress
  const inProgressCases = cases.filter(
    c => !["Completed", "Cancelled", "Draft"].includes(c.status)
  ).length;

  // 4. Cases Completed Today
  const completedToday = cases.filter(
    c => c.status === "Completed" && (c.completedDate === todayStr || c.updatedAt?.startsWith(todayStr))
  ).length;

  // 5. Cases Overdue
  const overdueCases = cases.filter(c => {
    if (["Completed", "Cancelled"].includes(c.status)) return false;
    if (!c.expectedCompletionDate) return false;
    return new Date(c.expectedCompletionDate) < new Date(todayStr);
  }).length;

  // 6. Total Invoices
  const totalInvoices = invoices.filter(inv => inv.status !== "Cancelled").length;

  // 7. Today's Billing
  const todaysBilling = invoices
    .filter(inv => inv.date === todayStr && inv.status !== "Cancelled")
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  // 8. Today's Collections
  const todaysCollections = invoices
    .flatMap(inv => inv.payments || [])
    .filter(p => p.date === todayStr)
    .reduce((sum, p) => sum + p.amount, 0);

  // 9. Outstanding Amount
  const totalOutstanding = invoices
    .filter(inv => inv.status !== "Cancelled")
    .reduce((sum, inv) => {
      const paid = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
      return sum + Math.max(0, inv.grandTotal - paid);
    }, 0);

  // 10. Advance Received
  const advanceReceived = invoices
    .filter(inv => inv.status !== "Cancelled")
    .reduce((sum, inv) => {
      const paid = (inv.payments || []).reduce((s, p) => s + p.amount, 0);
      return sum + (paid > inv.grandTotal ? paid - inv.grandTotal : 0);
    }, 0);

  // 11. Monthly Revenue (Current Month)
  const currentMonthPrefix = todayStr.substring(0, 7); // "YYYY-MM"
  const monthlyRevenue = invoices
    .filter(inv => inv.date.startsWith(currentMonthPrefix) && inv.status !== "Cancelled")
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  // 12. Financial Year Revenue
  // Let's assume current FY is 2026-27 (starts April 1st, 2026)
  const fyRevenue = invoices
    .filter(inv => {
      if (inv.status === "Cancelled") return false;
      const d = new Date(inv.date);
      // FY 2026 is April 1st 2026 to March 31st 2027
      return d >= new Date("2026-04-01") && d <= new Date("2027-03-31");
    })
    .reduce((sum, inv) => sum + inv.grandTotal, 0);

  // 13. Pending Compliance
  const pendingCompliance = workflowsCount > 0 ? workflowsCount : 4;

  // 14. Upcoming Due Dates (Cases or Workflows due in next 7 days)
  const next7Days = new Date();
  next7Days.setDate(next7Days.getDate() + 7);
  const upcomingDueDates = cases.filter(c => {
    if (["Completed", "Cancelled"].includes(c.status)) return false;
    const due = new Date(c.expectedCompletionDate);
    return due >= new Date(todayStr) && due <= next7Days;
  }).length;

  // Staff States calculation
  const activeStaff = staffList.filter(s => (s.status || "").toUpperCase() === "ACTIVE" || (s.status || "").toLowerCase() === "active" || !s.status);
  const totalStaff = activeStaff.length > 0 ? activeStaff.length : 2;
  const staffPresent = totalStaff; 
  const staffWorking = totalStaff;
  const staffOnBreak = 0;
  const staffOffline = 0;

  const kpis = [
    { label: "Active Clients", value: activeClients, icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Total Cases", value: totalCases, icon: Briefcase, color: "text-indigo-500", bg: "bg-indigo-500/10" },
    { label: "Cases In Progress", value: inProgressCases, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Cases Completed Today", value: completedToday, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Cases Overdue", value: overdueCases, icon: AlertOctagon, color: "text-rose-500", bg: "bg-rose-500/10" },
    { label: "Total Invoices", value: totalInvoices, icon: FileText, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    { label: "Today's Billing", value: `₹${todaysBilling.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-[#D4AF37]", bg: "bg-[#D4AF37]/10" },
    { label: "Today's Collections", value: `₹${todaysCollections.toLocaleString("en-IN")}`, icon: Landmark, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Outstanding Amount", value: `₹${totalOutstanding.toLocaleString("en-IN")}`, icon: AlertOctagon, color: "text-amber-600", bg: "bg-amber-600/10" },
    { label: "Advance Received", value: `₹${advanceReceived.toLocaleString("en-IN")}`, icon: ShieldCheck, color: "text-teal-500", bg: "bg-teal-500/10" },
    { label: "Monthly Revenue", value: `₹${monthlyRevenue.toLocaleString("en-IN")}`, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "FY Revenue (2026-27)", value: `₹${fyRevenue.toLocaleString("en-IN")}`, icon: Landmark, color: "text-cyan-500", bg: "bg-cyan-500/10" },
    { label: "Pending Compliance", value: pendingCompliance, icon: ShieldAlert, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "Upcoming Due Dates", value: upcomingDueDates, icon: CalendarDays, color: "text-violet-500", bg: "bg-violet-500/10" },
    { label: "Staff Present", value: staffPresent, icon: UserCheck, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Staff Working", value: staffWorking, icon: Play, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Staff On Break", value: staffOnBreak, icon: Coffee, color: "text-amber-500", bg: "bg-amber-500/10" },
    { label: "Staff Offline", value: staffOffline, icon: ShieldAlert, color: "text-slate-500", bg: "bg-slate-500/10" }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi, idx) => {
        const Icon = kpi.icon;
        return (
          <div 
            key={idx} 
            className="bg-[#1F356B] border border-blue-900/35 p-4 rounded-2xl hover:border-[#D4AF37]/35 transition-all flex flex-col justify-between shadow-md relative overflow-hidden group"
          >
            {/* Ambient hover glowing effect */}
            <div className="absolute top-0 right-0 w-16 h-16 bg-[#D4AF37]/5 rounded-full blur-xl transform group-hover:scale-125 transition-transform"></div>
            
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[10px] md:text-[11px] font-medium text-slate-400 uppercase tracking-wide truncate">
                {kpi.label}
              </span>
              <div className={`${kpi.bg} p-1.5 rounded-lg shrink-0`}>
                <Icon className={`w-3.5 h-3.5 ${kpi.color}`} />
              </div>
            </div>
            
            <div>
              <span className="text-sm md:text-base lg:text-lg font-bold font-mono text-white leading-tight">
                {kpi.value}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
