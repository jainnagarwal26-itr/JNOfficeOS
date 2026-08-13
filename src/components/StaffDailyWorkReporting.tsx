/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS - Module A: Staff Daily Work Reporting Component
 */

import React, { useState, useEffect } from "react";
import { 
  FileText, CheckCircle2, Clock, Calendar, AlertCircle, Save, Send, Eye, Filter, Check, ShieldCheck, UserCheck, Search, ChevronRight
} from "lucide-react";
import { User } from "../types";
import { StaffDailyReportRepository, StaffDailyReport } from "../lib/staffDailyReportRepository";
import { getUsers } from "../lib/db";
import { WorkspaceLayout } from "./WorkspaceLayout";

interface StaffDailyWorkReportingProps {
  currentUser: User;
  onAddAuditLog?: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export const StaffDailyWorkReporting: React.FC<StaffDailyWorkReportingProps> = ({
  currentUser,
  onAddAuditLog
}) => {
  const isOwner = currentUser.role === "OWNER" || currentUser.role === "SUPERADMIN";

  // Form State
  const [reportDate, setReportDate] = useState(StaffDailyReportRepository.getTodayDateString());
  const [workSummary, setWorkSummary] = useState("");
  const [completedWork, setCompletedWork] = useState("");
  const [pendingWork, setPendingWork] = useState("");
  const [clientRelatedWork, setClientRelatedWork] = useState("");
  const [caseRelatedWork, setCaseRelatedWork] = useState("");
  const [hoursWorked, setHoursWorked] = useState<number>(8.0);
  const [priorityItems, setPriorityItems] = useState("");
  const [remarks, setRemarks] = useState("");

  // UI state
  const [todayReport, setTodayReport] = useState<StaffDailyReport | null>(null);
  const [myHistory, setMyHistory] = useState<StaffDailyReport[]>([]);
  const [allReports, setAllReports] = useState<StaffDailyReport[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Filters for Owner
  const [filterStaffId, setFilterStaffId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");
  const [selectedDetailReport, setSelectedDetailReport] = useState<StaffDailyReport | null>(null);

  const loadData = () => {
    const todayRep = StaffDailyReportRepository.getTodayReport(currentUser.id);
    setTodayReport(todayRep);

    if (todayRep) {
      setWorkSummary(todayRep.workSummary || "");
      setCompletedWork(todayRep.completedWork || "");
      setPendingWork(todayRep.pendingWork || "");
      setClientRelatedWork(todayRep.clientRelatedWork || "");
      setCaseRelatedWork(todayRep.caseRelatedWork || "");
      setHoursWorked(todayRep.hoursWorked || 8.0);
      setPriorityItems(todayRep.priorityItems || "");
      setRemarks(todayRep.remarks || "");
    }

    setMyHistory(StaffDailyReportRepository.getStaffReports(currentUser.id));
    if (isOwner) {
      setAllReports(StaffDailyReportRepository.getAllStaffReports(currentUser));
      setStaffList(getUsers().filter(u => u.status === "ACTIVE"));
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  const handleSave = async (submitStatus: "DRAFT" | "SUBMITTED") => {
    if (!workSummary.trim()) {
      setFeedbackMsg({ text: "Please enter Today's Work Summary before saving.", type: "error" });
      return;
    }

    try {
      const res = await StaffDailyReportRepository.saveReport({
        reportDate,
        workSummary,
        completedWork,
        pendingWork,
        clientRelatedWork,
        caseRelatedWork,
        hoursWorked,
        priorityItems,
        remarks,
        status: submitStatus
      }, currentUser);

      if (res.success && res.data) {
        setFeedbackMsg({
          text: submitStatus === "SUBMITTED" 
            ? "✅ Daily Work Report successfully submitted for Owner review!" 
            : "💾 Draft report saved successfully.",
          type: "success"
        });

        if (onAddAuditLog) {
          onAddAuditLog(
            "DAILY_REPORT_SUBMITTED",
            "SYSTEM",
            `Staff ${currentUser.fullName || currentUser.name} ${submitStatus === "SUBMITTED" ? "submitted" : "saved draft"} daily work report for ${reportDate}.`
          );
        }

        loadData();
      } else {
        setFeedbackMsg({ text: res.error || "Failed to save daily report.", type: "error" });
      }
    } catch (e: any) {
      setFeedbackMsg({ text: e.message || "An error occurred.", type: "error" });
    }
  };

  const handleReview = async (reportId: string) => {
    const res = await StaffDailyReportRepository.reviewReport(reportId, "REVIEWED", currentUser);
    if (res.success) {
      setFeedbackMsg({ text: "Report marked as REVIEWED.", type: "success" });
      if (selectedDetailReport && selectedDetailReport.id === reportId) {
        setSelectedDetailReport({ ...selectedDetailReport, status: "REVIEWED" });
      }
      loadData();
    }
  };

  // Owner Filter Logic
  const filteredAllReports = allReports.filter(r => {
    if (filterStaffId !== "ALL" && r.staffUserId !== filterStaffId) return false;
    if (filterStatus !== "ALL" && r.status !== filterStatus) return false;
    if (filterDate && r.reportDate !== filterDate) return false;
    return true;
  });

  const todayStr = StaffDailyReportRepository.getTodayDateString();
  const todaySubmittedCount = allReports.filter(r => r.reportDate === todayStr && r.status !== "DRAFT").length;
  const totalStaffCount = staffList.length || 4;
  const totalHoursToday = allReports.filter(r => r.reportDate === todayStr).reduce((sum, r) => sum + (r.hoursWorked || 0), 0);

  return (
    <WorkspaceLayout id="staff_daily_work_workspace" className="animate-fade-in space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-blue-950 via-[#0D2C6C] to-slate-900 p-6 rounded-2xl border border-white/10 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-[#D4AF37]/20 border border-[#D4AF37]/40 rounded-xl text-[#D4AF37]">
              <FileText className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-black font-display tracking-wide">
              {isOwner ? "Staff Daily Work Reports Control Center" : "My Daily Work Reporting"}
            </h1>
          </div>
          <p className="text-xs text-slate-300 font-sans pl-10">
            {isOwner 
              ? "Comprehensive practice activity dashboard & staff task submission review" 
              : "Log your daily office accomplishments, pending filings, client engagements, and work notes"}
          </p>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <span className="text-xs px-3 py-1.5 rounded-xl bg-blue-950/60 border border-white/10 text-[#D4AF37] font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" /> {todayStr}
          </span>
        </div>
      </div>

      {feedbackMsg && (
        <div className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
          feedbackMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-rose-50 text-rose-800 border-rose-200"
        }`}>
          <span>{feedbackMsg.text}</span>
          <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">✕</button>
        </div>
      )}

      {/* VIEW A: OWNER DASHBOARD */}
      {isOwner && (
        <div className="space-y-6">
          {/* Metrics Overview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Reports Today</span>
                <UserCheck className="w-4 h-4 text-blue-600" />
              </div>
              <p className="text-2xl font-black text-slate-800">{todaySubmittedCount} / {totalStaffCount}</p>
              <span className="text-[10px] text-slate-500 font-medium">Active staff reporting progress</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Submitted Status</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-black text-emerald-600">{todaySubmittedCount}</p>
              <span className="text-[10px] text-slate-500 font-medium">Final reports submitted today</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Pending Reports</span>
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600">{Math.max(0, totalStaffCount - todaySubmittedCount)}</p>
              <span className="text-[10px] text-slate-500 font-medium">Staff yet to submit today</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-[10px] font-bold uppercase tracking-wider">Total Hours Logged</span>
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <p className="text-2xl font-black text-purple-600">{totalHoursToday.toFixed(1)} hrs</p>
              <span className="text-[10px] text-slate-500 font-medium">Cumulative hours logged for today</span>
            </div>
          </div>

          {/* Filters & Control Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs font-bold uppercase tracking-wider pr-2">
              <Filter className="w-4 h-4" /> Filters:
            </div>

            <select
              value={filterStaffId}
              onChange={(e) => setFilterStaffId(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Staff Members</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.fullName || s.name} ({s.user_number || s.id.substring(0, 6)})</option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUBMITTED">Submitted</option>
              <option value="DRAFT">Draft</option>
              <option value="REVIEWED">Reviewed</option>
            </select>

            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1 text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
            />

            {(filterStaffId !== "ALL" || filterStatus !== "ALL" || filterDate) && (
              <button
                onClick={() => { setFilterStaffId("ALL"); setFilterStatus("ALL"); setFilterDate(""); }}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline ml-auto"
              >
                Reset Filters
              </button>
            )}
          </div>

          {/* Reports Master Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800">Staff Work Reports Log</h3>
              <span className="text-xs text-slate-400 font-medium">Showing {filteredAllReports.length} records</span>
            </div>

            {filteredAllReports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-xs font-semibold text-slate-600">No staff daily reports found</p>
                <p className="text-[10px]">Reports submitted by staff members will populate dynamically.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="p-3">Staff Member</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Work Summary</th>
                      <th className="p-3">Hours</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {filteredAllReports.map(r => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="p-3 font-bold text-slate-800">
                          {r.staffName || r.staffUserId}
                          <span className="block text-[9px] font-mono text-slate-400 font-normal">{r.staffUserNumber || "STAFF"}</span>
                        </td>
                        <td className="p-3 font-mono text-slate-600 font-semibold">{r.reportDate}</td>
                        <td className="p-3 text-slate-700 max-w-xs truncate">{r.workSummary}</td>
                        <td className="p-3 font-bold text-purple-700">{r.hoursWorked} hrs</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            r.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                            r.status === "REVIEWED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                            "bg-amber-50 text-amber-700 border-amber-200"
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => setSelectedDetailReport(r)}
                            className="px-2.5 py-1 text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <Eye className="w-3 h-3" /> View Report
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: STAFF REPORT SUBMISSION FORM */}
      {!isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Form Column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-5">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  {todayReport ? "✏️ Edit Today's Daily Work Report" : "📝 Create Today's Work Report"}
                </h2>
                {todayReport && (
                  <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                    todayReport.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    Status: {todayReport.status}
                  </span>
                )}
              </div>

              {/* Form Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Report Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Hours Worked Today</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(parseFloat(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Today's Work Summary <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  placeholder="Summarize the core professional tasks completed today..."
                  value={workSummary}
                  onChange={(e) => setWorkSummary(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Completed Work Items</label>
                  <textarea
                    rows={3}
                    placeholder="List completed tasks (e.g. GST filings, ITRs)..."
                    value={completedWork}
                    onChange={(e) => setCompletedWork(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                  ></textarea>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Pending Work Items</label>
                  <textarea
                    rows={3}
                    placeholder="List tasks pending client inputs or review..."
                    value={pendingWork}
                    onChange={(e) => setPendingWork(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none font-sans"
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Related Work</label>
                  <input
                    type="text"
                    placeholder="Clients worked on today..."
                    value={clientRelatedWork}
                    onChange={(e) => setClientRelatedWork(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Priority Items for Tomorrow</label>
                  <input
                    type="text"
                    placeholder="High priority items for next day..."
                    value={priorityItems}
                    onChange={(e) => setPriorityItems(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Challenges</label>
                <input
                  type="text"
                  placeholder="Any delays, missing documents, or remarks..."
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                />
              </div>

              {/* Submit / Draft Action Buttons */}
              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleSave("DRAFT")}
                  className="px-4 py-2 text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" /> Save Draft
                </button>

                <button
                  type="button"
                  onClick={() => handleSave("SUBMITTED")}
                  className="px-5 py-2 text-xs font-bold bg-[#0D2C6C] hover:bg-blue-900 text-white rounded-xl shadow-md transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#D4AF37]" /> Submit Report
                </button>
              </div>

            </div>
          </div>

          {/* Previous Submissions History */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-2">
                My Previous Daily Reports
              </h3>

              {myHistory.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No previous daily reports submitted yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {myHistory.map(r => (
                    <div 
                      key={r.id}
                      onClick={() => setSelectedDetailReport(r)}
                      className="p-3 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200/70 transition-colors cursor-pointer space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 font-mono">{r.reportDate}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                          r.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          r.status === "REVIEWED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 line-clamp-2">{r.workSummary}</p>
                      <span className="text-[9px] text-purple-700 font-bold block pt-1">{r.hoursWorked} hours logged</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedDetailReport && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white max-w-xl w-full rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in">
            <div className="p-4 bg-gradient-to-r from-blue-950 to-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" /> Staff Daily Work Report Detail
              </h3>
              <button onClick={() => setSelectedDetailReport(null)} className="text-white/60 hover:text-white cursor-pointer">✕</button>
            </div>

            <div className="p-5 space-y-4 text-xs font-sans max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <span className="text-sm font-bold text-slate-800 block">{selectedDetailReport.staffName || selectedDetailReport.staffUserId}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{selectedDetailReport.reportDate} • Logged {selectedDetailReport.hoursWorked} hrs</span>
                </div>
                <span className={`px-2.5 py-1 rounded text-xs font-bold border ${
                  selectedDetailReport.status === "SUBMITTED" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                  selectedDetailReport.status === "REVIEWED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                  "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {selectedDetailReport.status}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Today's Work Summary</label>
                <p className="text-slate-800 font-medium bg-slate-50 p-3 rounded-xl border border-slate-200/70 whitespace-pre-wrap">{selectedDetailReport.workSummary}</p>
              </div>

              {selectedDetailReport.completedWork && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Completed Work</label>
                  <p className="text-slate-800 bg-emerald-50/50 p-3 rounded-xl border border-emerald-100 whitespace-pre-wrap">{selectedDetailReport.completedWork}</p>
                </div>
              )}

              {selectedDetailReport.pendingWork && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Pending Work</label>
                  <p className="text-slate-800 bg-amber-50/50 p-3 rounded-xl border border-amber-100 whitespace-pre-wrap">{selectedDetailReport.pendingWork}</p>
                </div>
              )}

              {selectedDetailReport.clientRelatedWork && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Client Engagement</label>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">{selectedDetailReport.clientRelatedWork}</p>
                </div>
              )}

              {selectedDetailReport.remarks && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Remarks / Notes</label>
                  <p className="text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">{selectedDetailReport.remarks}</p>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              {isOwner && selectedDetailReport.status !== "REVIEWED" && (
                <button
                  onClick={() => handleReview(selectedDetailReport.id)}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" /> Mark as Reviewed
                </button>
              )}
              <button
                onClick={() => setSelectedDetailReport(null)}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs transition-colors cursor-pointer ml-auto"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </WorkspaceLayout>
  );
};
