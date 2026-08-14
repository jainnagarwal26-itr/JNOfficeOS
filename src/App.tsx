/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, Phone, Mail, MapPin, LayoutDashboard, Users, Activity, 
  Settings, LogOut, ChevronRight, Menu, X, Shield, Clock, Database, 
  Sparkles, FileSpreadsheet, Lock, AlertCircle, FileText, Landmark,
  FolderOpen, CalendarDays, Receipt, BarChart3, UserCheck, AlertOctagon, HelpCircle,
  ClipboardList, Briefcase, Cpu, MessageSquare
} from "lucide-react";

import { User, UserRole, FirmSettings } from "./types";
import { 
  initializeDatabase, getUsers, getSettings, saveSettings, addAuditLog, getAuditLogs 
} from "./lib/db";
import { hasPermission, getPermissionLabel } from "./lib/permissions";
import { runAutomatedDataMigration } from "./lib/migrationUtility";

// Import core modules
import LoginScreen from "./components/LoginScreen";
import DashboardOverview from "./components/DashboardOverview";
import ExecutiveDashboard from "./components/ExecutiveDashboard";
import UserManagement from "./components/UserManagement";
import AuditLogViewer from "./components/AuditLogViewer";
import SettingsPanel from "./components/SettingsPanel";
import ClientCRM from "./components/ClientCRM";
import ServiceMaster from "./components/ServiceMaster";
import WorkflowEngine from "./components/WorkflowEngine";
import CaseManagement from "./components/CaseManagement";
import FinancialEngine from "./components/FinancialEngine";
import AutomationHub from "./components/AutomationHub";
import ReportingEngine from "./components/ReportingEngine";
import SmartDmsMaster from "./components/SmartDmsMaster";
import ClientPortalView from "./components/ClientPortalView";
import ComplianceRegisterView from "./components/ComplianceRegisterView";
import PartnerComplianceCommandCenter from "./components/PartnerComplianceCommandCenter";
import { StaffDailyWorkReporting } from "./components/StaffDailyWorkReporting";
import { PrivateStaffChat } from "./components/PrivateStaffChat";
import { EnterpriseConfigurationStudio } from "./components/EnterpriseConfigurationStudio";
import { ModalProvider } from "./components/ModalFramework";

export default function App() {
  const [dbInitialized, setDbInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<FirmSettings | null>(null);
  const [activeView, setActiveView] = useState<string>("dashboard");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [sessionCountdown, setSessionCountdown] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const handleShowToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initialize DB and settings on load
  useEffect(() => {
    const init = async () => {
      await initializeDatabase();
      const loadedSettings = getSettings();
      setSettings(loadedSettings);

      let sessionEmail: string | null = null;
      let remainingSeconds = loadedSettings.sessionTimeoutMinutes * 60;

      // Trigger safe non-destructive migration sync to Supabase PostgreSQL
      runAutomatedDataMigration().then((res) => {
        console.log("[JN OfficeOS Migration Engine] Sync Status:", res);
      }).catch((e) => {
        console.error("[JN OfficeOS Migration Engine] Sync Exception:", e);
      });

      // Official Supabase Auth Session Restoration (Survives page refresh & new tabs)
      try {
        const { supabase, isSupabaseConfigured } = await import("./lib/supabase");
        if (isSupabaseConfigured()) {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { authService } = await import("./lib/authService");
            const authUser = await authService.getCurrentUser();
            if (authUser) {
              const mappedUser: User = {
                id: authUser.id,
                email: authUser.email,
                name: authUser.fullName,
                role: authUser.role === "OWNER" ? UserRole.OWNER : UserRole.STAFF,
                passwordHash: "$2a$10$SupabaseAuthManagedIdentityHash",
                permissions: {
                  clientCrmView: true,
                  clientCrmEdit: authUser.role === "OWNER",
                  serviceMasterView: true,
                  serviceMasterEdit: authUser.role === "OWNER",
                  invoiceView: true,
                  invoiceCreate: true,
                  invoiceVoid: authUser.role === "OWNER",
                  receiptView: true,
                  receiptCreate: true,
                  expenseView: true,
                  expenseCreate: true,
                  reportsView: true,
                  settingsView: true,
                  settingsEdit: authUser.role === "OWNER",
                  auditLogView: authUser.role === "OWNER",
                  userManagementView: authUser.role === "OWNER",
                  userManagementEdit: authUser.role === "OWNER"
                },
                status: authUser.isActive ? "ACTIVE" : "INACTIVE",
                createdAt: new Date().toISOString(),
                username: authUser.userNumber || "user",
                mobile: authUser.phone || "",
                designation: authUser.designation || "Staff Member"
              };
              setCurrentUser(mappedUser);
              sessionEmail = authUser.email;
              remainingSeconds = loadedSettings.sessionTimeoutMinutes * 60;
            }
          }
        }
      } catch (authErr) {
        console.error("[App] Supabase Auth session restoration error:", authErr);
      }

      // Secure Session Restoration Fallback
      if (!sessionEmail) {
        const activeSessionRaw = localStorage.getItem("jn_officeos_active_session");
        const rememberedEmail = localStorage.getItem("jn_officeos_remember_session");

        if (activeSessionRaw) {
          try {
            const sessionObj = JSON.parse(activeSessionRaw);
            if (sessionObj.email && sessionObj.expiresAt) {
              const diff = Math.floor((sessionObj.expiresAt - Date.now()) / 1000);
              if (diff > 0) {
                sessionEmail = sessionObj.email;
                remainingSeconds = diff;
              }
            }
          } catch (e) {
            console.error("Failed parsing active session token:", e);
          }
        }

        if (!sessionEmail && rememberedEmail) {
          sessionEmail = rememberedEmail;
          remainingSeconds = loadedSettings.sessionTimeoutMinutes * 60;
        }

        if (sessionEmail && !currentUser) {
          const matchingUser = getUsers().find(
            (u) => (u.email || "").toLowerCase() === sessionEmail!.toLowerCase() && u.status === "ACTIVE"
          );
          if (matchingUser) {
            setCurrentUser(matchingUser);
            setSessionCountdown(remainingSeconds);
            addAuditLog(
              matchingUser.email,
              matchingUser.name,
              matchingUser.role,
              "SESSION_RESTORED",
              "AUTH",
              "Active session successfully restored on user device via persistent authentication keys."
            );
          }
        }
      }

      setDbInitialized(true);

      // Startup sync trigger: if Google Sheets is configured, load fresh production data first
      setTimeout(() => {
        import("./lib/googleSheetsService").then(async ({ googleSheetsService }) => {
          if (googleSheetsService.isActiveSyncEnabled()) {
            console.log("[App] Startup: Google Sheets is configured. Triggering fresh database pull...");
            const res = await googleSheetsService.pullAllFromSheets();
            if (res.success) {
              console.log("[App] Startup database pull completed successfully.");
              if (sessionEmail) {
                import("./lib/db").then(({ getUsers }) => {
                  const matchingUser = getUsers().find(
                    (u) => (u.email || "").toLowerCase() === sessionEmail!.toLowerCase() && u.status === "ACTIVE"
                  );
                  if (matchingUser) {
                    setCurrentUser(matchingUser);
                  }
                });
              }
            } else {
              console.warn("[App] Startup database pull failed (likely offline/unreachable):", res.message);
            }
          }
        });
      }, 1000);
    };
    const handleOnline = () => {
      console.log("[App] Internet connection restored. Attempting queue sync...");
      import("./lib/offlineSyncManager").then(({ OfflineSyncManager }) => {
        OfflineSyncManager.syncQueue();
      });
    };
    window.addEventListener("online", handleOnline);

    // Initial check on mount
    import("./lib/offlineSyncManager").then(({ OfflineSyncManager }) => {
      if (OfflineSyncManager.isOnline()) {
        OfflineSyncManager.syncQueue();
      }
    });

    init();

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  // Sync settings when they are updated in components
  const handleUpdateSettings = (newSettings: FirmSettings) => {
    setSettings(newSettings);
  };

  const handleAddAuditLog = (
    action: string, 
    category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", 
    details: string
  ) => {
    if (!currentUser) return;
    addAuditLog(currentUser.email, currentUser.name, currentUser.role, action, category, details);
  };

  // Logouts & Auth Handling
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    if (settings) {
      setSessionCountdown(settings.sessionTimeoutMinutes * 60);
    }
    setActiveView("dashboard");
  };

  const handleLogout = async (reason: "MANUAL" | "SESSION_TIMEOUT") => {
    if (!currentUser) return;

    // Clear Supabase Auth Session
    try {
      const { authService } = await import("./lib/authService");
      await authService.signOut();
    } catch (e) {
      console.error("[App] Supabase Auth signOut error:", e);
    }

    // Clear local session states on logout
    localStorage.removeItem("jn_officeos_active_session");
    if (reason === "MANUAL") {
      localStorage.removeItem("jn_officeos_remember_session");
    }

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      reason === "SESSION_TIMEOUT" ? "SESSION_TIMEOUT" : "USER_LOGOUT",
      "AUTH",
      reason === "SESSION_TIMEOUT" 
        ? "Session automatically terminated due to administrative inactivity timeout."
        : "User successfully terminated session manually."
    );

    setCurrentUser(null);
    setIsMobileSidebarOpen(false);
  };

  // Session Inactivity Management
  useEffect(() => {
    if (!currentUser || !settings) return;

    let timeoutId: NodeJS.Timeout;
    let timerInterval: NodeJS.Timeout;

    // Reset session timer on active interactions
    const resetTimer = () => {
      clearTimeout(timeoutId);
      clearInterval(timerInterval);

      const maxSeconds = settings.sessionTimeoutMinutes * 60;
      setSessionCountdown(maxSeconds);

      // Sync active session expiry with local storage so it survives refresh
      const expiresAt = Date.now() + maxSeconds * 1000;
      localStorage.setItem("jn_officeos_active_session", JSON.stringify({
        email: currentUser.email,
        expiresAt
      }));

      // Trigger automatic logout on expiry
      timeoutId = setTimeout(() => {
        handleLogout("SESSION_TIMEOUT");
      }, maxSeconds * 1000);

      // Decrement countdown tracker
      timerInterval = setInterval(() => {
        setSessionCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    };

    // Listeners for active human interactions
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    window.addEventListener("click", resetTimer);

    resetTimer(); // Initialize on mount

    return () => {
      clearTimeout(timeoutId);
      clearInterval(timerInterval);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      window.removeEventListener("click", resetTimer);
    };
  }, [currentUser, settings?.sessionTimeoutMinutes]);

  if (!dbInitialized || !settings) {
    return (
      <div className="min-h-screen bg-[#152952] flex flex-col items-center justify-center text-white space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-[#D4AF37] border-t-transparent rounded-full"></div>
        <span className="font-display font-medium tracking-wide text-sm text-slate-300">Initializing JN OfficeOS Workspace Engine...</span>
      </div>
    );
  }

  // Not Logged In -> Show Portal Login Screen
  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const formatCountdown = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Standard permission check helper
  const renderViewContent = () => {
    switch (activeView) {
      case "dashboard":
        return (
          <ExecutiveDashboard 
            currentUser={currentUser!}
            settings={settings!}
            onUpdateSettings={handleUpdateSettings}
            onAddAuditLog={handleAddAuditLog}
            setActiveView={setActiveView}
          />
        );

      case "users":
        if (!hasPermission(currentUser, "userManagementView")) {
          return <PermissionDeniedBlock requiredPermission="userManagementView" />;
        }
        return <UserManagement currentUser={currentUser} onAddAuditLog={handleAddAuditLog} />;

      case "audit":
        if (!hasPermission(currentUser, "auditLogView")) {
          return <PermissionDeniedBlock requiredPermission="auditLogView" />;
        }
        return <AuditLogViewer onAddAuditLog={handleAddAuditLog} />;

      case "settings":
        if (!hasPermission(currentUser, "settingsView")) {
          return <PermissionDeniedBlock requiredPermission="settingsView" />;
        }
        return (
          <SettingsPanel 
            currentUser={currentUser}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            onAddAuditLog={handleAddAuditLog}
          />
        );

      case "cases":
        return (
          <CaseManagement 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );

      case "clients":
        return (
          <ClientCRM 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );

      // SKELETON MODULE PLACEHOLDERS FOR BINDER DEMO
      case "services":
        return (
          <ServiceMaster 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "workflows":
        return (
          <WorkflowEngine 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "automation":
        return (
          <AutomationHub 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "daily_reports":
      case "staff_daily_reports":
        return (
          <StaffDailyWorkReporting
            currentUser={currentUser}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case "private_chat":
        return (
          <PrivateStaffChat
            currentUser={currentUser}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case "invoices":
        if (!hasPermission(currentUser, "invoiceView")) {
          return <PermissionDeniedBlock requiredPermission="invoiceView" />;
        }
        return (
          <FinancialEngine 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "expenses":
        return <ModuleSkeletonPlaceholder title="Expense Tracker" icon={<Landmark className="w-8 h-8 text-purple-600" />} desc="Log office rent, utilities, printing, stationery, salaries and manage financial reports synchronized directly to the 'Expenses' Google Sheet." />;
      case "reports":
        return (
          <ReportingEngine 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "dms":
        return (
          <SmartDmsMaster 
            currentUser={currentUser} 
            onAddAuditLog={handleAddAuditLog} 
          />
        );
      case "client_portal":
        return (
          <ClientPortalView 
            onLogout={() => setActiveView("dashboard")}
          />
        );
      case "compliance":
        return (
          <ComplianceRegisterView 
            currentUser={currentUser}
            onAddAuditLog={handleAddAuditLog}
          />
        );
      case "compliance_command_center":
        return (
          <PartnerComplianceCommandCenter 
            currentUser={currentUser}
            onNavigateToRegister={() => setActiveView("compliance")}
          />
        );
      case "studio":
        return (
          <EnterpriseConfigurationStudio 
            currentUser={currentUser} 
            onShowToast={handleShowToast}
          />
        );
      
      default:
        return <div className="text-sm text-slate-500">View not found.</div>;
    }
  };

  const getSidebarItemClass = (viewName: string) => {
    const base = "w-full text-left flex items-center justify-between px-4 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all duration-200";
    if (activeView === viewName) {
      return `${base} bg-[#D4AF37] text-[#0D2C6C] shadow-lg font-bold scale-[1.02]`;
    }
    return `${base} text-white/70 hover:bg-white/5 hover:text-white`;
  };

  return (
    <ModalProvider>
      <div className="min-h-screen bg-[#F4F7FA] flex flex-col" id="app_frame">
      
      {/* Upper Status Band */}
      <div className="h-1 w-full bg-gradient-to-r from-[#0D2C6C] via-[#D4AF37] to-[#0D2C6C] shrink-0"></div>

      {/* Main Header */}
      <header className="bg-white border-b border-slate-100 px-4 md:px-8 py-3.5 flex items-center justify-between shrink-0 shadow-sm z-30">
        
        {/* Left Side: Brand Logo Vector */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="md:hidden p-1.5 text-slate-500 hover:bg-slate-50 rounded-lg cursor-pointer"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-2">
            {/* Elegant logo representing the official JA brand */}
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center overflow-hidden shadow-sm border border-slate-100 shrink-0">
              <img 
                src="/logo.jpeg" 
                alt="Jain Agarwal & Co. Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <div className="font-display font-extrabold text-sm text-[#0D2C6C] tracking-tight leading-none uppercase">
                Jain Agarwal & Co.
              </div>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide font-sans">
                JN OfficeOS • Practice Platform
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Security Monitor and User Profile */}
        <div className="flex items-center gap-4 text-xs">
          
          {/* Security Countdown Monitor */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg font-mono text-slate-500">
            <Clock className="w-3.5 h-3.5 text-[#D4AF37] shrink-0 animate-pulse" />
            <span>Session Timeout:</span>
            <span className="font-bold text-[#0D2C6C]">{formatCountdown(sessionCountdown)}</span>
          </div>

          {/* Sync badge status indicator */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-50 text-emerald-800 border-emerald-100 font-semibold text-[10px] tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {settings.isGoogleSheetsConnected ? "Sheets Synced" : "Sandbox active"}
          </div>

          {/* Profile Name Block */}
          <div className="text-right hidden sm:block">
            <div className="font-semibold text-slate-800 leading-tight text-xs">{currentUser.name}</div>
            <span className="inline-block text-[9px] font-bold text-[#D4AF37] uppercase tracking-wider">{currentUser.role}</span>
          </div>

          {/* Logout Button */}
          <button
            onClick={() => handleLogout("MANUAL")}
            className="p-2 border border-slate-200 hover:border-red-200 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg cursor-pointer transition-colors"
            title="Terminate Active Session"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Inner Frame */}
      <div className="flex-grow flex relative">
        
        {/* SIDEBAR NAVIGATION - Desktop (persistent) */}
        <aside className="hidden md:flex w-64 bg-[#0D2C6C] text-white p-5 flex-col justify-between shrink-0 z-20 select-none shadow-2xl border-r border-blue-950/20">
          
          <div className="space-y-6">
            {/* Section 1: Dashboard */}
            <div className="space-y-2">
              <span className="block text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest pl-4">Principal Console</span>
              <button
                onClick={() => setActiveView("dashboard")}
                className={getSidebarItemClass("dashboard")}
              >
                <span className="flex items-center gap-2.5">
                  <LayoutDashboard className="w-4 h-4" />
                  Practice Workspace
                </span>
              </button>
            </div>

            {/* Section 2: Future Business Modules Skeletons */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-4">
                <span className="text-[9px] font-bold text-white/55 uppercase tracking-widest">Core Operations</span>
                <span className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-wider bg-white/10 px-1.5 rounded-md border border-white/5">Locked</span>
              </div>

              <button onClick={() => setActiveView("cases")} className={getSidebarItemClass("cases")}>
                <span className="flex items-center gap-2.5">
                  <Briefcase className="w-4 h-4" />
                  Enterprise Case Directory
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "cases" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("clients")} className={getSidebarItemClass("clients")}>
                <span className="flex items-center gap-2.5">
                  <Users className="w-4 h-4" />
                  Client CRM Ledger
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "clients" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("client_portal")} className={getSidebarItemClass("client_portal")}>
                <span className="flex items-center gap-2.5 text-[#D4AF37]">
                  <UserCheck className="w-4 h-4" />
                  Client Portal Workspace
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "client_portal" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("compliance")} className={getSidebarItemClass("compliance")}>
                <span className="flex items-center gap-2.5 text-emerald-400 font-bold">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Compliance Register
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "compliance" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("compliance_command_center")} className={getSidebarItemClass("compliance_command_center")}>
                <span className="flex items-center gap-2.5 text-[#D4AF37] font-bold">
                  <Shield className="w-4 h-4 text-[#D4AF37]" />
                  Partner Command Center
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "compliance_command_center" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("services")} className={getSidebarItemClass("services")}>
                <span className="flex items-center gap-2.5">
                  <Receipt className="w-4 h-4" />
                  Services Catalog
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "services" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("workflows")} className={getSidebarItemClass("workflows")}>
                <span className="flex items-center gap-2.5">
                  <ClipboardList className="w-4 h-4" />
                  Compliance Workflows
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "workflows" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("automation")} className={getSidebarItemClass("automation")}>
                <span className="flex items-center gap-2.5">
                  <Cpu className="w-4 h-4" />
                  Automation & Alerts Hub
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "automation" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("daily_reports")} className={getSidebarItemClass("daily_reports")}>
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4 text-[#D4AF37]" />
                  {currentUser.role === "OWNER" || currentUser.role === "SUPERADMIN" ? "Staff Daily Reports" : "My Daily Work"}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "daily_reports" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("private_chat")} className={getSidebarItemClass("private_chat")}>
                <span className="flex items-center gap-2.5">
                  <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
                  {currentUser.role === "OWNER" || currentUser.role === "SUPERADMIN" ? "Private Staff Chat" : "Private Chat"}
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "private_chat" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("invoices")} className={getSidebarItemClass("invoices")}>
                <span className="flex items-center gap-2.5">
                  <FileText className="w-4 h-4" />
                  Invoicing Engine
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "invoices" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("expenses")} className={getSidebarItemClass("expenses")}>
                <span className="flex items-center gap-2.5">
                  <Landmark className="w-4 h-4" />
                  Expense Tracker
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "expenses" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("reports")} className={getSidebarItemClass("reports")}>
                <span className="flex items-center gap-2.5">
                  <BarChart3 className="w-4 h-4" />
                  Financial Reports
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "reports" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>

              <button onClick={() => setActiveView("dms")} className={getSidebarItemClass("dms")}>
                <span className="flex items-center gap-2.5">
                  <FolderOpen className="w-4 h-4 text-amber-400" />
                  Smart DMS PRO
                </span>
                <ChevronRight className={`w-3.5 h-3.5 ${activeView === "dms" ? "text-[#0D2C6C]" : "text-white/30"}`} />
              </button>
            </div>

            {/* Section 3: Administrative Parameters */}
            <div className="space-y-2">
              <span className="block text-[9px] font-bold text-white/55 uppercase tracking-widest pl-4">Administration</span>
              
              <button
                onClick={() => setActiveView("users")}
                className={getSidebarItemClass("users")}
                disabled={!hasPermission(currentUser, "userManagementView")}
                title={!hasPermission(currentUser, "userManagementView") ? "Access Denied: Requires userManagementView Permission" : ""}
              >
                <span className="flex items-center gap-2.5">
                  <Shield className="w-4 h-4" />
                  User Profiles & Access
                </span>
                {!hasPermission(currentUser, "userManagementView") ? (
                  <Lock className="w-3 h-3 text-white/30" />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${activeView === "users" ? "text-[#0D2C6C]" : "text-white/30"}`} />
                )}
              </button>

              <button
                onClick={() => setActiveView("audit")}
                className={getSidebarItemClass("audit")}
                disabled={!hasPermission(currentUser, "auditLogView")}
                title={!hasPermission(currentUser, "auditLogView") ? "Access Denied: Requires auditLogView Permission" : ""}
              >
                <span className="flex items-center gap-2.5">
                  <Activity className="w-4 h-4" />
                  System Audit Ledger
                </span>
                {!hasPermission(currentUser, "auditLogView") ? (
                  <Lock className="w-3 h-3 text-white/30" />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${activeView === "audit" ? "text-[#0D2C6C]" : "text-white/30"}`} />
                )}
              </button>

              <button
                onClick={() => setActiveView("settings")}
                className={getSidebarItemClass("settings")}
                disabled={!hasPermission(currentUser, "settingsView")}
                title={!hasPermission(currentUser, "settingsView") ? "Access Denied: Requires settingsView Permission" : ""}
              >
                <span className="flex items-center gap-2.5">
                  <Settings className="w-4 h-4" />
                  Practice Settings
                </span>
                {!hasPermission(currentUser, "settingsView") ? (
                  <Lock className="w-3 h-3 text-white/30" />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${activeView === "settings" ? "text-[#0D2C6C]" : "text-white/30"}`} />
                )}
              </button>

              <button
                onClick={() => setActiveView("studio")}
                className={getSidebarItemClass("studio")}
                title="Launch Enterprise Control Center"
              >
                <span className="flex items-center gap-2.5 text-yellow-400">
                  <Settings className="w-4 h-4 text-yellow-400 animate-spin-slow" />
                  Enterprise Studio
                </span>
                {currentUser.role !== "OWNER" ? (
                  <Lock className="w-3 h-3 text-white/30" />
                ) : (
                  <ChevronRight className={`w-3.5 h-3.5 ${activeView === "studio" ? "text-[#0D2C6C]" : "text-white/30"}`} />
                )}
              </button>
            </div>
          </div>

          <div className="mt-auto pt-6 border-t border-white/5">
            <div className="bg-blue-900/40 rounded-2xl p-4 border border-white/5 shadow-inner">
              <p className="text-[9px] text-white/50 uppercase tracking-widest">Account Role</p>
              <p className="text-white text-xs font-bold mt-1 tracking-wide uppercase">{currentUser.role === "OWNER" ? "MASTER ADMIN" : currentUser.role}</p>
              <div className="h-1 w-full bg-white/10 rounded-full mt-2 overflow-hidden">
                <div 
                  className="h-full bg-[#D4AF37] transition-all duration-500" 
                  style={{ width: currentUser.role === "OWNER" ? "100%" : "50%" }}
                ></div>
              </div>
            </div>
          </div>

        </aside>

        {/* MOBILE SIDEBAR PANEL (Drawer Overlay) */}
        <AnimatePresence>
          {isMobileSidebarOpen && (
            <>
              {/* Dark Backing Blur */}
              <div 
                className="fixed inset-0 bg-[#0A1C40]/25 backdrop-blur-sm z-40 md:hidden"
                onClick={() => setIsMobileSidebarOpen(false)}
              ></div>

              {/* Sidebar Panel Drawer */}
              <motion.aside 
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "tween", duration: 0.25 }}
                className="fixed inset-y-0 left-0 w-64 bg-[#0D2C6C] text-white p-5 space-y-6 z-50 md:hidden flex flex-col justify-between shadow-2xl border-r border-blue-950/20"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-center pb-2 border-b border-white/10">
                    <span className="font-display font-extrabold text-xs text-[#D4AF37] tracking-wider uppercase">JN OfficeOS Menu</span>
                    <button onClick={() => setIsMobileSidebarOpen(false)}>
                      <X className="w-4 h-4 text-white/60" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    {/* Items Group 1 */}
                    <div className="space-y-1">
                      <button
                        onClick={() => { setActiveView("dashboard"); setIsMobileSidebarOpen(false); }}
                        className={getSidebarItemClass("dashboard")}
                      >
                        <span className="flex items-center gap-2.5">
                          <LayoutDashboard className="w-4 h-4" />
                          Practice Workspace
                        </span>
                      </button>
                    </div>

                    {/* Items Group 2 Skeletons */}
                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-white/55 uppercase tracking-widest pl-4 mb-2">Core Operations</span>
                      
                      {["cases", "clients", "services", "workflows", "automation", "invoices", "expenses", "reports", "dms"].map((v) => {
                        let label = v.charAt(0).toUpperCase() + v.slice(1) + " Module";
                        if (v === "cases") label = "Enterprise Case Directory";
                        else if (v === "workflows") label = "Compliance Workflows";
                        else if (v === "automation") label = "Automation & Alerts Hub";
                        else if (v === "clients") label = "Client CRM Ledger";
                        else if (v === "services") label = "Services Catalog";
                        else if (v === "dms") label = "Smart DMS PRO Dashboard";
                        return (
                          <button
                            key={v}
                            onClick={() => { setActiveView(v); setIsMobileSidebarOpen(false); }}
                            className={getSidebarItemClass(v)}
                          >
                            <span className="flex items-center gap-2.5">
                              <ChevronRight className="w-3.5 h-3.5 text-white/30" />
                              {label}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Items Group 3 admin */}
                    <div className="space-y-1">
                      <span className="block text-[8px] font-bold text-white/55 uppercase tracking-widest pl-4 mb-2">Administration</span>
                      
                      <button
                        onClick={() => { setActiveView("users"); setIsMobileSidebarOpen(false); }}
                        className={getSidebarItemClass("users")}
                        disabled={!hasPermission(currentUser, "userManagementView")}
                      >
                        <span className="flex items-center gap-2.5">
                          <Shield className="w-4 h-4" />
                          User Profiles & Access
                        </span>
                      </button>

                      <button
                        onClick={() => { setActiveView("audit"); setIsMobileSidebarOpen(false); }}
                        className={getSidebarItemClass("audit")}
                        disabled={!hasPermission(currentUser, "auditLogView")}
                      >
                        <span className="flex items-center gap-2.5">
                          <Activity className="w-4 h-4" />
                          System Audit Ledger
                        </span>
                      </button>

                      <button
                        onClick={() => { setActiveView("settings"); setIsMobileSidebarOpen(false); }}
                        className={getSidebarItemClass("settings")}
                        disabled={!hasPermission(currentUser, "settingsView")}
                      >
                        <span className="flex items-center gap-2.5">
                          <Settings className="w-4 h-4" />
                          Practice Settings
                        </span>
                      </button>

                      <button
                        onClick={() => { setActiveView("studio"); setIsMobileSidebarOpen(false); }}
                        className={getSidebarItemClass("studio")}
                      >
                        <span className="flex items-center gap-2.5 text-yellow-400">
                          <Settings className="w-4 h-4" />
                          Enterprise Studio
                        </span>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/5 pt-4 text-xs text-white/50">
                  Logged in: <span className="text-white font-medium">{currentUser.name}</span>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* WORKSPACE CONTENT MAIN CANVAS */}
        <main className="flex-grow p-4 md:p-8 overflow-y-auto max-h-[calc(100vh-62px)] select-text">
          <div className="max-w-7xl mx-auto">
            {renderViewContent()}
          </div>
        </main>

      </div>

      {/* Elegant Toast Alert Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs font-semibold flex items-center gap-2.5 ${
              toast.type === "success"
                ? "bg-slate-900 border-emerald-500/30 text-emerald-400"
                : "bg-slate-900 border-red-500/30 text-red-400"
            }`}
          >
            <div className={`w-2 h-2 rounded-full ${toast.type === "success" ? "bg-emerald-500" : "bg-red-500"} animate-pulse`} />
            <span>{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
    </ModalProvider>
  );
}

// --------------------------------------------------------------------------
// AUXILIARY SMALL VIEW HELPER COMPONENTS
// --------------------------------------------------------------------------

interface DeniedProps {
  requiredPermission: string;
}

function PermissionDeniedBlock({ requiredPermission }: DeniedProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-8 text-center max-w-lg mx-auto my-12 space-y-4">
      <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto border border-red-100">
        <AlertOctagon className="w-8 h-8" />
      </div>
      <h3 className="font-display font-semibold text-red-900 text-base">Workspace Access Restricted</h3>
      <p className="text-xs text-slate-500 leading-relaxed">
        Your current credentials do not grant authorization keys to access this administration panel. 
        Your account profile requires the specific permission key: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-red-700">{requiredPermission}</code>.
      </p>
      <p className="text-[11px] text-slate-400">
        Contact CA. Jain Agarwal (Owner) to adjust your dynamic security permissions list.
      </p>
    </div>
  );
}

interface SkeletonProps {
  title: string;
  icon: React.ReactNode;
  desc: string;
}

function ModuleSkeletonPlaceholder({ title, icon, desc }: SkeletonProps) {
  return (
    <div className="space-y-6">
      
      {/* Skeleton Header Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl shadow-inner shrink-0">
            {icon}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-semibold text-slate-800 text-base">{title}</h2>
              <span className="text-[8px] font-bold text-[#D4AF37] uppercase tracking-wider bg-amber-50 border border-amber-100 px-1.5 rounded">Architectural Skeleton</span>
            </div>
            <p className="text-xs text-slate-400 font-sans mt-0.5">{desc}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border bg-slate-50 text-slate-500 border-slate-200 font-mono text-[10px] tracking-wide uppercase">
          <Database className="w-3.5 h-3.5 text-slate-400" />
          Pending Module Bindings
        </span>
      </div>

      {/* High Fidelity Technical Overview / Future Design Block */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Technical binder definitions */}
        <div className="lg:col-span-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <h3 className="font-display font-bold text-xs text-[#0D2C6C] uppercase tracking-wider border-b border-slate-50 pb-2">Future Schema Target</h3>
          
          <div className="space-y-3 text-xs">
            <p className="text-slate-500 leading-relaxed">
              This module is planned as a client-side layout proxy connected directly via HTTPS to your background Google Sheets database. 
            </p>
            
            <div className="space-y-2 border-t border-slate-50 pt-3">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide">Key Functions to Implement:</span>
              <ul className="space-y-1.5 list-disc pl-4 text-slate-600">
                <li>Automated spreadsheet row insertion on form submissions</li>
                <li>Lazy rendering data tables with full client-side search</li>
                <li>Dynamic data transformations to custom JSON</li>
                <li>OAuth credentialed record deletions</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right Side: Beautiful Wireframe mock visualization */}
        <div className="lg:col-span-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 pb-3">
            <h3 className="font-display font-bold text-xs text-[#0D2C6C] uppercase tracking-wider">Visual Interface Wireframe Preview</h3>
            <span className="text-[10px] text-slate-400">Interactive Mock Controls</span>
          </div>

          <div className="border border-dashed border-slate-200 rounded-xl p-8 text-center text-slate-400 space-y-3 bg-slate-50/50">
            <Sparkles className="w-10 h-10 text-[#D4AF37]/50 mx-auto animate-pulse" />
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-700">UI Layout Prepared for Binding</p>
              <p className="text-[11px] text-slate-500 max-w-sm mx-auto leading-normal">
                Visual layouts and local storage sandbox records are configured for direct REST binding. In the next phase, we will connect the spreadsheet CRUD endpoints to auto-render rows.
              </p>
            </div>
            
            <div className="inline-flex gap-2">
              <button disabled className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-semibold rounded-lg">
                Seeded Tables Active
              </button>
              <button disabled className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-400 text-[10px] font-semibold rounded-lg">
                Form State Ready
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
