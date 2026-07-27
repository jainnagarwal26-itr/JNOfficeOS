/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Activity, Search, Filter, ShieldAlert, Key, Database, Settings, RefreshCw, HelpCircle
} from "lucide-react";
import { AuditLog } from "../types";
import { getAuditLogs, resetDatabaseToDefault } from "../lib/db";

interface AuditLogViewerProps {
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function AuditLogViewer({ onAddAuditLog }: AuditLogViewerProps) {
  const [logs, setLogs] = useState<AuditLog[]>(getAuditLogs());
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const handleRefresh = () => {
    setLogs(getAuditLogs());
  };

  const handleClearLogsForDemo = () => {
    const confirm = window.confirm("Are you sure you want to perform a developer database reset to factory defaults? This clears custom accounts, restores demo configurations, and generates a new system log.");
    if (!confirm) return;

    resetDatabaseToDefault().then(() => {
      setLogs(getAuditLogs());
      alert("Database reset completed successfully.");
    });
  };

  // Filtering Logic
  const filteredLogs = logs.filter((log) => {
    const matchesCategory = categoryFilter === "ALL" || log.category === categoryFilter;
    
    const searchString = `${log.action} ${log.details} ${log.userEmail} ${log.userName}`.toLowerCase();
    const matchesSearch = searchString.includes(searchQuery.toLowerCase().trim());

    return matchesCategory && matchesSearch;
  });

  const getCategoryBadgeColor = (category: AuditLog["category"]) => {
    switch (category) {
      case "AUTH":
        return "bg-blue-50 text-blue-700 border-blue-100";
      case "SECURITY":
        return "bg-red-50 text-red-700 border-red-100";
      case "DATABASE":
        return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case "SETTINGS":
        return "bg-purple-50 text-purple-700 border-purple-100";
      case "SYSTEM":
        return "bg-slate-100 text-slate-700 border-slate-200";
      default:
        return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  const getCategoryIcon = (category: AuditLog["category"]) => {
    switch (category) {
      case "AUTH":
        return <Key className="w-3.5 h-3.5" />;
      case "SECURITY":
        return <ShieldAlert className="w-3.5 h-3.5" />;
      case "DATABASE":
        return <Database className="w-3.5 h-3.5" />;
      case "SETTINGS":
        return <Settings className="w-3.5 h-3.5" />;
      default:
        return <Activity className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Title block */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="font-display font-semibold text-[#0D2C6C] text-lg tracking-tight flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#D4AF37]" />
            Practice Audit Log Ledger
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Immutable log directory monitoring authentication, permission modifications, configuration updates, and core database sync queries.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1 text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Logs
          </button>
          
          <button
            onClick={handleClearLogsForDemo}
            className="p-2 border border-dashed border-red-200 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
          >
            Developer Reset
          </button>
        </div>
      </div>

      {/* Query Filters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
        
        {/* Search Input */}
        <div className="md:col-span-8 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search action logs, specific actor emails, details..."
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D2C6C] transition-colors"
          />
        </div>

        {/* Category Dropdown */}
        <div className="md:col-span-4 relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-lg text-xs text-slate-600 focus:outline-none focus:border-[#0D2C6C] bg-white appearance-none"
          >
            <option value="ALL">Show All Categories</option>
            <option value="AUTH">Authentication (AUTH)</option>
            <option value="SECURITY">Security / RBAC (SECURITY)</option>
            <option value="DATABASE">Google Sync / Ledger (DATABASE)</option>
            <option value="SETTINGS">System Settings (SETTINGS)</option>
            <option value="SYSTEM">Platform Core (SYSTEM)</option>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-400">
            <Filter className="w-3.5 h-3.5" />
          </div>
        </div>

      </div>

      {/* Audit Log Table Grid */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="p-3 pl-5">Timestamp</th>
                <th className="p-3">Category</th>
                <th className="p-3">Actor Identity</th>
                <th className="p-3">Action Description</th>
                <th className="p-3 pr-5">Event Log Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/40 transition-colors">
                    {/* Timestamp */}
                    <td className="p-3 pl-5 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>

                    {/* Category Label */}
                    <td className="p-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getCategoryBadgeColor(log.category)}`}>
                        {getCategoryIcon(log.category)}
                        {log.category}
                      </span>
                    </td>

                    {/* Actor Identity */}
                    <td className="p-3 whitespace-nowrap min-w-[150px]">
                      <div className="font-semibold text-slate-800 leading-tight">{log.userName}</div>
                      <div className="text-[10px] text-slate-400">{log.userEmail}</div>
                    </td>

                    {/* Action */}
                    <td className="p-3 whitespace-nowrap">
                      <span className="font-mono font-bold text-[#0D2C6C] uppercase bg-blue-50/30 px-1.5 py-0.5 rounded border border-blue-100/50">
                        {log.action}
                      </span>
                    </td>

                    {/* Details */}
                    <td className="p-3 pr-5 font-sans leading-relaxed text-slate-500 max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl break-words">
                      {log.details}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-slate-500">No events matched query filters</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Try modifying your search criteria or changing log filter tags.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
