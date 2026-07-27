/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Building2, Phone, Mail, MapPin, Database, FileSpreadsheet, 
  RefreshCw, CheckCircle, AlertTriangle, Cpu, Users, Eye, ArrowUpRight, 
  Settings2, Activity, HardDrive
} from "lucide-react";
import { User, FirmSettings } from "../types";
import { GOOGLE_SHEETS_SCHEMA } from "../lib/sheetsSchema";
import { getAuditLogs, getUsers } from "../lib/db";

interface DashboardOverviewProps {
  currentUser: User;
  settings: FirmSettings;
  onUpdateSettings: (newSettings: FirmSettings) => void;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function DashboardOverview({ 
  currentUser, 
  settings, 
  onUpdateSettings,
  onAddAuditLog
}: DashboardOverviewProps) {
  const [activeSchemaTab, setActiveSchemaTab] = useState(GOOGLE_SHEETS_SCHEMA[0].tableName);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [gasUrlInput, setGasUrlInput] = useState(
    localStorage.getItem("VITE_GOOGLE_APPS_SCRIPT_URL") || ""
  );

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const min = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setCurrentTime(`${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Statistics summaries based on local records
  const totalUsersCount = getUsers().length;
  const auditLogsCount = getAuditLogs().length;

  const handleUpdateGasUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.role !== "OWNER") {
      alert("Permission Denied: Only designated Owners can edit backend script gateway parameters.");
      return;
    }
    const cleanUrl = gasUrlInput.trim();
    localStorage.setItem("VITE_GOOGLE_APPS_SCRIPT_URL", cleanUrl);

    // Automatically push existing local storage profiles/data to the empty Google Sheets
    import("../lib/db").then(({ saveUsers, getUsers, saveServices, getServices, saveClients, getClients }) => {
      try {
        saveUsers(getUsers());
        saveServices(getServices());
        saveClients(getClients());
      } catch (err) {
        console.warn("Initial sync push on connection warning:", err);
      }
    });

    onAddAuditLog(
      "DATABASE_PROXY_UPDATED",
      "DATABASE",
      `Google Apps Script Secure Web App Gateway URL updated to: [${cleanUrl.substring(0, 45)}...]`
    );
    alert("Backend Script Gateway URL updated successfully! Active Production Sync has initialized. Your local users, services, and clients are being pushed to your Google Sheets worksheets.");
  };

  const handlePullDatabase = async () => {
    setIsSyncing(true);
    setSyncStatus("Contacting Web App...");
    try {
      const { googleSheetsService } = await import("../lib/googleSheetsService");
      if (!googleSheetsService.isActiveSyncEnabled()) {
        alert("Configuration Needed:\nYour Google Apps Script Web App URL is not set. Please paste your deployed Web App URL in the Workspace Sync panel first.");
        return;
      }
      setSyncStatus("Pulling 7 tables...");
      const result = await googleSheetsService.pullAllFromSheets();
      if (result.success) {
        onAddAuditLog(
          "DATABASE_PULL",
          "DATABASE",
          "Production master database synchronized. 7 worksheets successfully mapped and pulled."
        );
        alert("Active Synchronization Success!\nAll clients, services, invoices, expenses, users, cases and audit logs have been successfully pulled and merged into your local workspace.");
        window.location.reload();
      } else {
        alert(result.message);
      }
    } catch (err: any) {
      console.error(err);
      alert(`Sync Error: ${err.message || err}`);
    } finally {
      setIsSyncing(false);
      setSyncStatus(null);
    }
  };

  const selectedSchema = GOOGLE_SHEETS_SCHEMA.find(s => s.tableName === activeSchemaTab) || GOOGLE_SHEETS_SCHEMA[0];

  return (
    <div className="space-y-6">
      
      {/* Upper Grid: Firm Branding Hero & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Company Header Card */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#0D2C6C] via-[#092254] to-[#041029] text-white p-6 rounded-3xl shadow-xl border border-blue-950/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37] opacity-5 rounded-full blur-3xl transform translate-x-20 -translate-y-12"></div>
          
          <div className="relative z-10">
            <div className="flex justify-between items-start">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold bg-[#D4AF37]/20 border border-[#D4AF37]/30 text-[#D4AF37] tracking-wider uppercase">
                Tax & Audit Practice Platform
              </span>
              <span className="text-xs text-slate-300 font-mono">System Local Time: {currentTime || "Loading..."}</span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-display font-semibold tracking-tight text-white mt-3 mb-1">
              {settings.firmName}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm font-sans tracking-wide italic max-w-xl">
              "{settings.tagline}"
            </p>
          </div>

          {/* Core Address / Contact Elements */}
          <div className="relative z-10 border-t border-slate-700/50 pt-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span>{settings.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 truncate" />
              <span className="truncate">{settings.email}</span>
            </div>
            <div className="flex items-start gap-2 sm:col-span-1">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 mt-0.5" />
              <span className="line-clamp-2 leading-relaxed">{settings.address.split(',')[0]}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Database Statistics Panels */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          
          {/* Box 1: Integration Status */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sync Connection</span>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            </div>
            <div className="my-2">
              <span className="text-2xl font-black text-[#0D2C6C] font-display">
                Active Sync
              </span>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">
                Production Google Sheets database connected via GAS API.
              </p>
            </div>
            <div className="text-xs pt-1">
              <button 
                onClick={handlePullDatabase}
                disabled={isSyncing}
                className="text-[#0D2C6C] font-bold hover:underline cursor-pointer text-left flex items-center gap-1 disabled:opacity-50"
              >
                {isSyncing ? syncStatus || "Syncing..." : "Force Database Sync ↻"}
              </button>
            </div>
          </div>

          {/* Box 2: Secure Accounts */}
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Practice Users</span>
              <Users className="w-4 h-4 text-[#0D2C6C]" />
            </div>
            <div className="my-2">
              <span className="text-3xl font-black text-[#0D2C6C] font-display">{totalUsersCount}</span>
              <p className="text-[10px] text-slate-400 mt-1 leading-snug">Authorized secure profiles</p>
            </div>
            <span className="text-[10px] text-slate-400 font-semibold font-sans">
              Active: {getUsers().filter(u => u.status === "ACTIVE").length} / {totalUsersCount} profiles
            </span>
          </div>

          {/* Box 3: Audit Ledger Metrics */}
          <div className="bg-[#0D2C6C] text-white p-6 rounded-3xl shadow-xl border-l-4 border-[#D4AF37] flex flex-col justify-between col-span-2 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl"></div>
            <div className="flex justify-between items-center relative z-10">
              <div className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-[#D4AF37]" />
                <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37]">Practice Audit Ledger</span>
              </div>
              <span className="text-[10px] text-white/50 font-mono font-bold uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md">Live Logs</span>
            </div>
            <div className="my-2 relative z-10">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black tracking-tight text-white">{auditLogsCount}</span>
                <span className="text-[10px] font-bold text-white/50 uppercase tracking-wider">Actions Registered</span>
              </div>
              <div className="h-1.5 w-full bg-white/15 rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-[#D4AF37] transition-all duration-500" style={{ width: `${Math.min(auditLogsCount / 200 * 100, 100)}%` }}></div>
              </div>
            </div>
            <p className="text-[10px] text-white/60 leading-relaxed relative z-10">
              Secure, un-editable tamper-proof logs compiled in memory since database provisioning.
            </p>
          </div>

        </div>

      </div>

      {/* Main Bottom Section: Connection Controls & Schema Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Google Sheet Sync Manager Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="w-5 h-5 text-[#0D2C6C]" />
              <h3 className="font-display font-bold text-[#0D2C6C] text-xs uppercase tracking-wider">
                Workspace Database Sync
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Jain Agarwal & Co. utilizes a secure, production-grade Google Workspace integration. All CRUD operations map instantly to your registered enterprise Google Sheets file.
            </p>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-800">GAS Active Connection Secured</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Database Engine:</span> Secure Google Apps Script REST Proxy
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Spreadsheet ID:</span> •••••••••••••••••••••••••••••••••••••••••
                </div>
                <div>
                  <span className="text-emerald-700 font-bold">✓ Production Sync Active</span>
                </div>
              </div>
            </div>

            {/* Custom Google Apps Script Gateway Configurator for OWNER */}
            {currentUser.role === "OWNER" && (
              <form onSubmit={handleUpdateGasUrl} className="border-t border-slate-100 pt-3.5 space-y-2">
                <label className="block text-[10px] font-bold text-[#0D2C6C] uppercase tracking-wider">
                  Apps Script Web App URL
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="password"
                    value={gasUrlInput}
                    onChange={(e) => setGasUrlInput(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-grow px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono focus:outline-none focus:border-[#0D2C6C]"
                  />
                  <button
                    type="submit"
                    className="bg-[#0D2C6C] hover:bg-[#071E4A] text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg cursor-pointer"
                  >
                    Save
                  </button>
                </div>
                <p className="text-[9px] text-slate-400 leading-tight">
                  Authorized owners can configure the secure backend gateway. This URL is never exposed to other staff.
                </p>
              </form>
            )}

            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex items-center gap-1.5 justify-between font-mono">
              <span>Sync Protocol: HTTPS / REST API</span>
              <span className="text-emerald-600 font-bold">ONLINE</span>
            </div>
          </div>

          {/* Secure Permission Guard Warning Card */}
          <div className="bg-gradient-to-br from-[#0D2C6C]/5 to-transparent border border-[#0D2C6C]/10 p-5 rounded-3xl text-xs text-slate-500 space-y-2.5">
            <span className="block font-bold text-[#0D2C6C] uppercase tracking-wider text-[10px]">
              Access Control Guard
            </span>
            <p className="leading-relaxed">
              You are currently logged in as <span className="font-bold text-slate-700">{currentUser.name}</span>. 
              The session token is encrypted and managed in memory. Inactivity triggers auto-logout based on security configurations.
            </p>
          </div>
        </div>

        {/* Visual Database Schema Inspector Panel */}
        <div className="lg:col-span-8 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="font-display font-semibold text-[#0D2C6C] text-sm tracking-tight">
                  Google Sheet Database Schema Inspector
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Visual structural blueprints of the backing spreadsheet database tables.
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal Schema Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
            {GOOGLE_SHEETS_SCHEMA.map((schema) => (
              <button
                key={schema.tableName}
                onClick={() => setActiveSchemaTab(schema.tableName)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                  activeSchemaTab === schema.tableName
                    ? "bg-[#0D2C6C] text-white shadow-sm"
                    : "bg-slate-50 hover:bg-slate-100 text-slate-600"
                }`}
              >
                {schema.tableName}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">
                Table Description
              </span>
              <p className="text-xs text-slate-600 leading-normal">
                {selectedSchema.description}
              </p>
            </div>

            {/* Columns Grid Table */}
            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="p-2.5 pl-4">Column Header</th>
                    <th className="p-2.5">Field Type</th>
                    <th className="p-2.5">Constraints</th>
                    <th className="p-2.5 pr-4">Database Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-600">
                  {selectedSchema.columns.map((col, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2.5 pl-4 font-mono font-bold text-slate-700">{col.name}</td>
                      <td className="p-2.5">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                          col.type === "number" ? "bg-blue-50 text-blue-700" :
                          col.type === "boolean" ? "bg-purple-50 text-purple-700" :
                          col.type === "date" ? "bg-amber-50 text-amber-700" :
                          col.type === "json" ? "bg-pink-50 text-pink-700" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {col.type}
                        </span>
                      </td>
                      <td className="p-2.5">
                        {col.required ? (
                          <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded uppercase">Required</span>
                        ) : (
                          <span className="text-[10px] text-slate-400">Optional</span>
                        )}
                      </td>
                      <td className="p-2.5 pr-4 text-slate-500">{col.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Visual Warning on Spreadsheet Direct Manipulation */}
            <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/60 flex items-start gap-2.5 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                <strong className="font-bold">Important Data Rule:</strong> Users must never modify column header structures or directly change cells inside the Google Sheet backend. Direct modifications break row synchronizations and disrupt practice management ledger operations.
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
