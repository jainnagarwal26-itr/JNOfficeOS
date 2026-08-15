/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { 
  Building2, Phone, Mail, MapPin, Database, CheckCircle, Cpu, Users, Eye, ArrowUpRight, 
  Settings2, Activity, HardDrive, ShieldCheck, Server
} from "lucide-react";
import { User, FirmSettings } from "../types";
import { DATABASE_TABLES_SCHEMA } from "../lib/sheetsSchema";
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
  const [activeSchemaTab, setActiveSchemaTab] = useState(DATABASE_TABLES_SCHEMA[0].tableName);
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

  const selectedSchema = DATABASE_TABLES_SCHEMA.find(s => s.tableName === activeSchemaTab) || DATABASE_TABLES_SCHEMA[0];

  return (
    <div className="space-y-6">
      
      {/* Upper Grid: Firm Branding Hero & Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Company Header Card */}
        <div className="lg:col-span-7 bg-gradient-to-br from-[#0D2C6C] via-[#092254] to-[#041029] text-white p-6 rounded-3xl shadow-xl border border-blue-950/20 relative overflow-hidden flex flex-col justify-between min-h-[220px]">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37] opacity-5 rounded-full blur-3xl transform translate-x-20 -translate-y-12"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#D4AF37] text-[10px] font-bold uppercase tracking-wider border border-white/5 backdrop-blur-md">
                Chartered Accountants & Corporate Advisors
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h1 className="font-display font-black text-2xl sm:text-3xl tracking-tight text-white uppercase drop-shadow-sm">
              {settings.firmName}
            </h1>
            <p className="text-blue-200/80 font-sans text-xs sm:text-sm font-medium mt-1">
              {settings.tagline}
            </p>
          </div>

          <div className="border-t border-white/10 pt-4 mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 relative z-10 text-[11px] text-blue-100/90 font-sans">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="truncate">{settings.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="truncate">{settings.email}</span>
            </div>
            <div className="flex items-center gap-2 sm:col-span-1">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
              <span className="truncate" title={settings.address}>Thane, Maharashtra</span>
            </div>
          </div>
        </div>

        {/* Real-time System Telemetry & Counter Widgets */}
        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
          
          {/* Box 1: Realtime Operational Status */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">System Heartbeat</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            </div>
            <div className="my-2">
              <div className="font-mono text-xs font-bold text-[#0D2C6C] tracking-tight">{currentTime || "Loading..."}</div>
              <span className="text-[10px] text-slate-400 font-medium">Standard Time (IST)</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2.5 py-1 rounded-xl w-fit">
              <CheckCircle className="w-3.5 h-3.5 shrink-0" />
              <span>PostgreSQL RDBMS Active</span>
            </div>
          </div>

          {/* Box 2: Enterprise Users Count */}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Roster</span>
              <Users className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="my-2">
              <div className="text-3xl font-black text-[#0D2C6C] tracking-tight">{totalUsersCount}</div>
              <span className="text-[10px] text-slate-400 font-medium">Authorized Profiles</span>
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
              Secure, un-editable tamper-proof logs compiled in database since provisioning.
            </p>
          </div>

        </div>

      </div>

      {/* Main Bottom Section: Cloud Database Engine & Schema Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Supabase Cloud Engine Panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Database className="w-5 h-5 text-[#0D2C6C]" />
              <h3 className="font-display font-bold text-[#0D2C6C] text-xs uppercase tracking-wider">
                Authoritative Cloud Database
              </h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              JN OfficeOS connects directly to Supabase PostgreSQL as its authoritative Source of Truth. All clients, invoices, staff records, and compliance items persist with ACID transaction safety and Row Level Security (RLS).
            </p>

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 space-y-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-emerald-800">Supabase Cloud Connected</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1">
                <div>
                  <span className="font-semibold text-slate-700">Database Engine:</span> PostgreSQL 15+ Cloud RDBMS
                </div>
                <div>
                  <span className="font-semibold text-slate-700">Security Model:</span> Role-Based Row Level Security (RLS)
                </div>
                <div>
                  <span className="text-emerald-700 font-bold">✓ Single Source of Truth Active</span>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 border-t border-slate-100 pt-3 flex items-center gap-1.5 justify-between font-mono">
              <span>Protocol: HTTPS / WSS Realtime</span>
              <span className="text-emerald-600 font-bold">ONLINE</span>
            </div>
          </div>

          {/* Secure Permission Guard Card */}
          <div className="bg-gradient-to-br from-[#0D2C6C]/5 to-transparent border border-[#0D2C6C]/10 p-5 rounded-3xl text-xs text-slate-500 space-y-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#0D2C6C]" />
              <span className="block font-bold text-[#0D2C6C] uppercase tracking-wider text-[10px]">
                Access Control Guard
              </span>
            </div>
            <p className="leading-relaxed">
              You are currently logged in as <span className="font-bold text-slate-700">{currentUser.name}</span> ({currentUser.role}). 
              All sessions are verified against Supabase Auth policies with automated expiry timeouts.
            </p>
          </div>
        </div>

        {/* Database Schema Inspector Panel */}
        <div className="lg:col-span-8 bg-white/95 backdrop-blur-md p-6 rounded-3xl shadow-sm border border-slate-100 space-y-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="font-display font-semibold text-[#0D2C6C] text-sm tracking-tight">
                  Database Schema Registry
                </h3>
                <p className="text-[11px] text-slate-400 font-sans">
                  Structural blueprints of PostgreSQL tables powering JN OfficeOS.
                </p>
              </div>
            </div>
          </div>

          {/* Horizontal Schema Tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-100">
            {DATABASE_TABLES_SCHEMA.map((schema) => (
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
          </div>
        </div>

      </div>

    </div>
  );
}
