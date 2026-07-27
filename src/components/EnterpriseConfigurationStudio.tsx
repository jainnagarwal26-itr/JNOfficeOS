/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../types";
import { CompanyOfficeStudio } from "./studio/CompanyOfficeStudio";
import { DepartmentsDesignationsStudio } from "./studio/DepartmentsDesignationsStudio";
import { BrandingStudio } from "./studio/BrandingStudio";
import { RolePermissionStudio } from "./studio/RolePermissionStudio";
import { NumberingFieldsStudio } from "./studio/NumberingFieldsStudio";
import { FeatureFlagsStudio } from "./studio/FeatureFlagsStudio";
import { DashboardDesigner } from "./studio/DashboardDesigner";
import { ReportDesigner } from "./studio/ReportDesigner";
import { PdfTemplateDesigner } from "./studio/PdfTemplateDesigner";
import { WorkflowDesigner } from "./studio/WorkflowDesigner";
import { BusinessRuleDesigner } from "./studio/BusinessRuleDesigner";
import { NotificationReminderDesigner } from "./studio/NotificationReminderDesigner";
import { SnapshotMarketplaceStudio } from "./studio/SnapshotMarketplaceStudio";
import {
  Settings,
  Building,
  Palette,
  Shield,
  Hash,
  Flag,
  LayoutGrid,
  FileSpreadsheet,
  FileText,
  Workflow,
  Cpu,
  Bell,
  History,
  Lock,
  X,
  AlertCircle
} from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
  onClose?: () => void;
}

type TabType =
  | "company"
  | "departments"
  | "branding"
  | "roles"
  | "numbering"
  | "flags"
  | "dashboard"
  | "reports"
  | "pdf"
  | "workflows"
  | "rules"
  | "alerts"
  | "snapshots";

export const EnterpriseConfigurationStudio: React.FC<Props> = ({ currentUser, onShowToast, onClose }) => {
  const [activeTab, setActiveTab] = useState<TabType>("company");

  const isOwner = 
    currentUser.role === "OWNER" || 
    String(currentUser.role).toLowerCase() === "superadmin" || 
    String(currentUser.role).toLowerCase() === "super_admin" || 
    String(currentUser.role).toLowerCase() === "super admin";

  // Sidebar item configuration
  const menuItems = [
    { id: "company" as TabType, label: "Company & Office", icon: Building, desc: "Legal indexes & shift hours" },
    { id: "departments" as TabType, label: "Departments & Designations", icon: Building, desc: "Manage master divisions & hierarchy" },
    { id: "branding" as TabType, label: "Branding Studio", icon: Palette, desc: "Visual identity guidelines" },
    { id: "roles" as TabType, label: "Role & Clearance", icon: Shield, desc: "RBAC authority matrix" },
    { id: "numbering" as TabType, label: "Numbering & Fields", icon: Hash, desc: "Custom series & metadata" },
    { id: "flags" as TabType, label: "Feature Flags", icon: Flag, desc: "Applet modular status" },
    { id: "dashboard" as TabType, label: "Dashboard Designer", icon: LayoutGrid, desc: "Widget layout organizer" },
    { id: "reports" as TabType, label: "Report Designer", icon: FileSpreadsheet, desc: "Custom spreadsheet queries" },
    { id: "pdf" as TabType, label: "PDF Template Designer", icon: FileText, desc: "Visual watermark & print" },
    { id: "workflows" as TabType, label: "Workflow Designer", icon: Workflow, desc: "Transition rules & SLA limit" },
    { id: "rules" as TabType, label: "Business Rule Engine", icon: Cpu, desc: "Assertion logic & builders" },
    { id: "alerts" as TabType, label: "Alerts & Reminders", icon: Bell, desc: "Message channels & tax crons" },
    { id: "snapshots" as TabType, label: "Backup & Snapshots", icon: History, desc: "Configuration archive state" }
  ];

  if (!isOwner) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 bg-slate-950 text-slate-100" id="studio-locked-screen">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-md text-center space-y-4 shadow-2xl relative">
          {onClose && (
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-slate-300">
              <X className="w-5 h-5" />
            </button>
          )}
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-full flex items-center justify-center mx-auto text-red-500">
            <Lock className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold tracking-tight text-slate-100">Access Restricted</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The **Enterprise Configuration Studio** acts as the core administrative control room for JN OfficeOS.
            Only accounts with **SuperAdmin** status can customize company details, financial variables, branding matrices, or security firewalls.
          </p>
          <div className="pt-4 border-t border-slate-800 flex items-center justify-center gap-2 text-xs text-slate-500">
            <AlertCircle className="w-4 h-4 text-yellow-500" />
            <span>Current Role: <strong className="text-slate-400">{currentUser.role === "OWNER" ? "SuperAdmin" : currentUser.role}</strong></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] bg-slate-950 text-slate-100 flex flex-col" id="enterprise-configuration-studio-app">
      {/* Top Banner Control Header */}
      <div className="border-b border-slate-800 bg-slate-950 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-yellow-500 animate-spin-slow" />
          <div>
            <h1 className="text-lg font-extrabold tracking-tight text-slate-100 flex items-center gap-2">
              Enterprise Configuration Studio <span className="text-[10px] bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded font-mono">Control Center</span>
            </h1>
            <p className="text-xs text-slate-400">Manage, backup, and customize the entire physical ecosystem of your practice</p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 bg-slate-900 border border-slate-800 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4 text-slate-400 hover:text-slate-200" />
          </button>
        )}
      </div>

      {/* Main split tab layout */}
      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        {/* Left Sidebar Category Selection */}
        <div className="w-full md:w-64 border-r border-slate-800/80 bg-slate-950 flex flex-col">
          <div className="p-3 border-b border-slate-800/40">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-3 py-1">Studio Pipelines</span>
          </div>
          <nav className="flex-1 p-2 space-y-1 overflow-y-auto max-h-[70vh] md:max-h-none scrollbar-thin">
            {menuItems.map(item => {
              const IconComp = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                    isActive
                      ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-400"
                      : "bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/45"
                  }`}
                >
                  <IconComp className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-yellow-400" : "text-slate-500"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold leading-none">{item.label}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5 truncate">{item.desc}</p>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right Active Editing Canvas */}
        <main className="flex-1 p-6 md:p-8 bg-slate-950/40 overflow-y-auto max-h-[80vh] md:max-h-none scrollbar-thin">
          {activeTab === "company" && (
            <CompanyOfficeStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "departments" && (
            <DepartmentsDesignationsStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "branding" && (
            <BrandingStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "roles" && (
            <RolePermissionStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "numbering" && (
            <NumberingFieldsStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "flags" && (
            <FeatureFlagsStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "dashboard" && (
            <DashboardDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "reports" && (
            <ReportDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "pdf" && (
            <PdfTemplateDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "workflows" && (
            <WorkflowDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "rules" && (
            <BusinessRuleDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "alerts" && (
            <NotificationReminderDesigner currentUser={currentUser} onShowToast={onShowToast} />
          )}
          {activeTab === "snapshots" && (
            <SnapshotMarketplaceStudio currentUser={currentUser} onShowToast={onShowToast} />
          )}
        </main>
      </div>
    </div>
  );
};
