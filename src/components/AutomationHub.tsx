/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Bell, Cpu, CalendarClock, Database, Send, Archive, Check, Sparkles, Plus, 
  Search, Filter, Play, CheckCircle2, AlertTriangle, AlertCircle, Info, Megaphone, 
  Clock, ShieldAlert, Pin, RefreshCw, Eye, ListChecks, FileSpreadsheet, Layers, Trash2, ChevronRight, X
} from "lucide-react";
import { User, UserRole, AppNotification, AutomationRule, AppReminder, RuleExecutionLog, AppEvent } from "../types";
import { eventBus } from "../lib/eventBus";
import { NotificationRepository } from "../lib/notificationRepository";
import { AutomationRepository } from "../lib/automationRepository";
import { ReminderRepository } from "../lib/reminderRepository";
import { EventRepository } from "../lib/eventRepository";
import { getUsers } from "../lib/db";
import { supabase, isSupabaseConfigured } from "../lib/supabase";
import { WorkspaceLayout } from "./WorkspaceLayout";

interface AutomationHubProps {
  currentUser: User;
  onAddAuditLog: (
    action: string, 
    category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", 
    details: string
  ) => void;
}

class AutomationHubErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[AutomationHubErrorBoundary] Intercepted runtime error:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem("jn_officeos_notifications");
      localStorage.removeItem("jn_officeos_automation_rules");
      localStorage.removeItem("jn_officeos_automation_logs");
      localStorage.removeItem("jn_officeos_reminders");
      localStorage.removeItem("jn_officeos_events");
    } catch (e) {
      console.error(e);
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-white rounded-3xl p-8 border border-red-200 shadow-xl max-w-2xl mx-auto my-12 text-center space-y-4">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h3 className="font-display font-extrabold text-slate-800 text-lg">
            Notification & Automation Hub Recovery Mode
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            An unexpected error occurred while rendering the automation telemetry layer:
          </p>
          <pre className="p-3 bg-slate-900 text-amber-400 font-mono text-[11px] rounded-xl text-left overflow-x-auto max-h-32">
            {this.state.error?.message || "Unknown error"}
          </pre>
          <div className="flex justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
            >
              Reload Page
            </button>
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-[#0D2C6C] text-[#D4AF37] hover:bg-[#071d44] text-xs font-bold rounded-xl cursor-pointer shadow-md"
            >
              Clear Cache & Restore Seed Data
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function AutomationHub({ currentUser, onAddAuditLog }: AutomationHubProps) {
  return (
    <AutomationHubErrorBoundary>
      <AutomationHubInner currentUser={currentUser} onAddAuditLog={onAddAuditLog} />
    </AutomationHubErrorBoundary>
  );
}

function AutomationHubInner({ currentUser, onAddAuditLog }: AutomationHubProps) {
  // Navigation Tabs within the Hub
  const [currentTab, setCurrentTab] = useState<"NOTIFICATIONS" | "AUTOMATION" | "REMINDERS" | "TELEMETRY">("NOTIFICATIONS");

  // Local state mirrored from repositories
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [reminders, setReminders] = useState<AppReminder[]>([]);
  const [events, setEvents] = useState<AppEvent[]>([]);
  const [logs, setLogs] = useState<RuleExecutionLog[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);

  // Search & Filter state
  const [notifSearch, setNotifSearch] = useState("");
  const [notifFilterType, setNotifFilterType] = useState<string>("ALL");
  const [notifFilterPriority, setNotifFilterPriority] = useState<string>("ALL");
  
  // Reminder filter
  const [reminderFilter, setReminderFilter] = useState<"ALL" | "Pending" | "Completed" | "Overdue">("ALL");

  // Owner Broadcast Forms
  const [broadcastType, setBroadcastType] = useState<"Announcement" | "Reminder" | "Information">("Announcement");
  const [broadcastTitle, setBroadcastTitle] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastPin, setBroadcastPin] = useState(false);
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");

  // Reminder Creation Form
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [newRemTitle, setNewRemTitle] = useState("");
  const [newRemDesc, setNewRemDesc] = useState("");
  const [newRemCategory, setNewRemCategory] = useState<AppReminder["category"]>("Compliance");
  const [newRemDueDate, setNewRemDueDate] = useState("");
  const [newRemAssignee, setNewRemAssignee] = useState("");
  const [newRemClient, setNewRemClient] = useState("");

  // Rule Editing states
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editPriority, setEditPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  const [editTrigger, setEditTrigger] = useState("");

  // Load all repository data
  const loadAllData = async () => {
    try {
      setNotifications(NotificationRepository.getNotifications(currentUser));
      setRules(AutomationRepository.getRules());
      setReminders(ReminderRepository.getReminders());
      setEvents(EventRepository.getEvents());
      setLogs(AutomationRepository.getLogs());

      let currentUsers = getUsers();
      if (isSupabaseConfigured()) {
        try {
          const { data: dbUsers } = await supabase
            .from("jn_users")
            .select("*")
            .eq("is_active", true);

          if (dbUsers && dbUsers.length > 0) {
            const mappedUsers: User[] = dbUsers.map(u => ({
              id: u.id,
              email: u.email,
              name: u.full_name,
              role: u.role === "OWNER" || u.role === "SUPERADMIN" ? UserRole.OWNER : UserRole.STAFF,
              passwordHash: u.password_hash || "",
              permissions: {
                clientCrmView: true,
                clientCrmEdit: u.role === "OWNER",
                serviceMasterView: true,
                serviceMasterEdit: u.role === "OWNER",
                invoiceView: true,
                invoiceCreate: true,
                invoiceVoid: u.role === "OWNER",
                receiptView: true,
                receiptCreate: true,
                expenseView: true,
                expenseCreate: true,
                reportsView: true,
                settingsView: true,
                settingsEdit: u.role === "OWNER",
                auditLogView: u.role === "OWNER",
                userManagementView: u.role === "OWNER",
                userManagementEdit: u.role === "OWNER"
              },
              status: u.is_active ? "ACTIVE" : "INACTIVE",
              createdAt: u.created_at || new Date().toISOString(),
              username: u.user_number || "user",
              mobile: u.phone || "",
              designation: u.designation || "Staff Member"
            }));
            currentUsers = mappedUsers;
          }
        } catch (e) {}
      }
      setStaffUsers(currentUsers);
    } catch (err) {
      console.error("Failed to sync Automation Hub caches", err);
    }
  };

  useEffect(() => {
    loadAllData();

    // Subscribe to EventBus wildcard notifications to update telemetry lists instantly
    const unsubscribe = eventBus.subscribe("*", (evt) => {
      console.log("[AutomationHub] Live system event intercepted in UI:", evt);
      loadAllData();
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, []);

  // Broadcast Handler (Owner only action)
  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastMessage.trim()) return;

    try {
      // 1. Publish Event on central Event Bus
      eventBus.publish(
        broadcastType === "Announcement" ? "ANNOUNCEMENT_BROADCASTED" : "OWNER_MESSAGE",
        "Owner Message Center",
        {
          title: broadcastTitle,
          message: broadcastMessage,
          isPinned: broadcastPin,
          target: broadcastTarget
        },
        currentUser?.email || "",
        currentUser?.name || "Owner"
      );

      // 2. Write direct Notification entry
      NotificationRepository.addNotification({
        type: broadcastType,
        title: `${broadcastPin ? "📌 [PINNED] " : ""}${broadcastTitle}`,
        message: broadcastMessage,
        channel: "In-App Notification",
        priority: "High",
        targetUserId: broadcastTarget,
        metadata: { isPinned: broadcastPin, broadcastedBy: currentUser?.fullName || currentUser?.name || "Owner" }
      }, currentUser);

      // Reset
      setBroadcastTitle("");
      setBroadcastMessage("");
      setBroadcastPin(false);

      onAddAuditLog(
        "OWNER_BROADCAST_CREATED",
        "SYSTEM",
        `Owner broadcasted official message [Type: ${broadcastType}] to audience: ${broadcastTarget}.`
      );

      loadAllData();
    } catch (err) {
      console.error("Broadcast failed", err);
    }
  };

  // Create Reminder Handler
  const handleCreateReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRemTitle.trim() || !newRemDueDate) return;

    try {
      const added = ReminderRepository.addReminder({
        title: newRemTitle,
        description: newRemDesc,
        category: newRemCategory,
        dueDate: newRemDueDate,
        assignedToId: newRemAssignee || undefined,
        clientName: newRemClient || undefined
      });

      // Publish on Event Bus
      eventBus.publish(
        "TASK_CREATED",
        "Reminder Engine",
        {
          id: added.id,
          title: newRemTitle,
          dueDate: newRemDueDate,
          category: newRemCategory,
          assignedToId: newRemAssignee
        },
        currentUser.email,
        currentUser.name
      );

      // Close Modal
      setShowReminderModal(false);
      setNewRemTitle("");
      setNewRemDesc("");
      setNewRemDueDate("");
      setNewRemAssignee("");
      setNewRemClient("");

      onAddAuditLog(
        "REMINDER_CREATED",
        "DATABASE",
        `New compliance reminder '${newRemTitle}' scheduled for ${newRemDueDate}.`
      );

      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Mark notification read
  const handleMarkRead = (id: string) => {
    NotificationRepository.markAsRead(id);
    loadAllData();
  };

  // Archive notification
  const handleArchive = (id: string) => {
    NotificationRepository.archive(id);
    loadAllData();
  };

  // Complete reminder
  const handleCompleteReminder = (id: string) => {
    ReminderRepository.completeReminder(id);
    // Publish completed event
    const found = reminders.find(r => r.id === id);
    if (found) {
      eventBus.publish(
        "TASK_COMPLETED",
        "Reminder Engine",
        { id, title: found.title, category: found.category },
        currentUser.email,
        currentUser.name
      );
    }
    loadAllData();
  };

  // Delete reminder
  const handleDeleteReminder = (id: string) => {
    ReminderRepository.deleteReminder(id);
    loadAllData();
  };

  // Toggle rule status
  const handleToggleRule = (ruleId: string, currentVal: boolean) => {
    try {
      AutomationRepository.updateRule(ruleId, { isEnabled: !currentVal });
      onAddAuditLog(
        "AUTOMATION_RULE_TOGGLED",
        "SETTINGS",
        `Automation rule '${ruleId}' status updated to ${!currentVal ? "ENABLED" : "DISABLED"}.`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Update rule details
  const handleSaveRuleConfig = (ruleId: string) => {
    try {
      AutomationRepository.updateRule(ruleId, {
        priority: editPriority,
        triggerEvent: editTrigger
      });
      setEditingRuleId(null);
      onAddAuditLog(
        "AUTOMATION_RULE_CONFIGURED",
        "SETTINGS",
        `Configured priority [${editPriority}] and trigger [${editTrigger}] for automation rule '${ruleId}'.`
      );
      loadAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Filtered Notifications
  const filteredNotifications = (notifications || []).filter(notif => {
    if (!notif || notif.isArchived) return false;

    // Audience targeting filter
    const isOwner = currentUser?.role === "OWNER" || currentUser?.role === "SUPERADMIN";
    if (!isOwner) {
      const target = (notif.targetUserId || "all").trim();
      const isBroadcast = target === "all" || target === "ALL_STAFF" || target === "ALL" || !target;
      const userId = (currentUser?.id || "").trim();
      const userNum = (currentUser?.user_number || "").trim().toLowerCase();
      const email = (currentUser?.email || "").trim().toLowerCase();
      const username = (currentUser?.username || "").trim().toLowerCase();

      const isDirectTarget = 
        target === userId || 
        (userNum && target.toLowerCase() === userNum) || 
        (email && target.toLowerCase() === email) || 
        (username && target.toLowerCase() === username);

      if (!isBroadcast && !isDirectTarget) {
        return false;
      }
    }

    // Search filter
    const titleStr = String(notif.title || "").toLowerCase();
    const msgStr = String(notif.message || "").toLowerCase();
    const searchStr = String(notifSearch || "").toLowerCase();

    const matchesSearch = titleStr.includes(searchStr) || msgStr.includes(searchStr);
    
    // Type filter
    const matchesType = notifFilterType === "ALL" || notif.type === notifFilterType;

    // Priority filter
    const matchesPriority = notifFilterPriority === "ALL" || notif.priority === notifFilterPriority;

    return matchesSearch && matchesType && matchesPriority;
  });

  const unreadCount = (notifications || []).filter(n => n && !n.isRead && !n.isArchived).length;

  return (
    <WorkspaceLayout id="automation_hub_workspace" className="animate-fade-in">
      
      {/* Title Insignia Block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-[#0D2C6C]/10 text-[#0D2C6C] border border-[#0D2C6C]/20 rounded text-[10px] font-bold tracking-wider uppercase font-mono">
              Enterprise Hub
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">Active Stream Layer</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-extrabold text-[#0D2C6C] tracking-tight mt-1 flex items-center gap-2">
            <Cpu className="w-7 h-7 text-[#D4AF37]" />
            Notification & Automation Hub
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl font-sans">
            Centralized pub/sub event bus coordinating practice updates, active alerts, compliance triggers, and customizable rule behaviors.
          </p>
        </div>

        {/* Tab Selection Pill Group */}
        <div className="flex overflow-x-auto gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/50 self-start md:self-center scrollbar-none shrink-0">
          <button
            onClick={() => setCurrentTab("NOTIFICATIONS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === "NOTIFICATIONS"
                ? "bg-white text-[#0D2C6C] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            Notification Board
            {unreadCount > 0 && (
              <span className="ml-1 bg-red-500 text-white font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setCurrentTab("AUTOMATION")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === "AUTOMATION"
                ? "bg-white text-[#0D2C6C] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            Rules Configurator
          </button>

          <button
            onClick={() => setCurrentTab("REMINDERS")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === "REMINDERS"
                ? "bg-white text-[#0D2C6C] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <CalendarClock className="w-3.5 h-3.5" />
            Compliance Reminders
          </button>

          <button
            onClick={() => setCurrentTab("TELEMETRY")}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
              currentTab === "TELEMETRY"
                ? "bg-white text-[#0D2C6C] shadow-sm"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Event Telemetry
          </button>
        </div>
      </div>

      {/* SUB-WORKSPACE 1: NOTIFICATION BOARD */}
      {currentTab === "NOTIFICATIONS" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left / Center Panel: Filter and Notification Stream */}
          <div className="lg:col-span-2 space-y-4">
            
            {/* Filter and Search Bar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
              <div className="relative w-full md:flex-grow">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search alert title or messages..."
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)} // Redirect to update local search query
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] focus:border-[#D4AF37]"
                />
              </div>

              <div className="flex gap-2 w-full md:w-auto shrink-0 justify-end">
                {/* Type Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 border border-slate-200/60 rounded-xl">
                  <Filter className="w-3 h-3 text-slate-400" />
                  <select
                    value={notifFilterType}
                    onChange={(e) => setNotifFilterType(e.target.value)}
                    className="text-[11px] font-semibold text-slate-600 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="ALL">All Types</option>
                    <option value="Information">Information</option>
                    <option value="Success">Success</option>
                    <option value="Warning">Warning</option>
                    <option value="Critical">Critical</option>
                    <option value="Reminder">Reminder</option>
                    <option value="Announcement">Announcement</option>
                  </select>
                </div>

                {/* Priority Filter */}
                <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 border border-slate-200/60 rounded-xl">
                  <select
                    value={notifFilterPriority}
                    onChange={(e) => setNotifFilterPriority(e.target.value)}
                    className="text-[11px] font-semibold text-slate-600 bg-transparent outline-none cursor-pointer"
                  >
                    <option value="ALL">All Priority</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Notification List Panel */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-50 flex items-center justify-between bg-slate-50/40">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-slate-800 text-sm">System Notification Stream</h3>
                  <span className="text-[10px] bg-slate-200/80 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                    {filteredNotifications.length} items
                  </span>
                </div>
                
                {/* Quick actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      NotificationRepository.markAllRead();
                      loadAllData();
                    }}
                    className="text-[10px] font-bold text-[#0D2C6C] hover:underline cursor-pointer"
                  >
                    Mark All Read
                  </button>
                  <span className="text-slate-300">•</span>
                  <button
                    onClick={() => {
                      NotificationRepository.archiveAll();
                      loadAllData();
                    }}
                    className="text-[10px] font-bold text-slate-500 hover:underline cursor-pointer"
                  >
                    Archive All
                  </button>
                </div>
              </div>

              {/* Feed List */}
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Bell className="w-8 h-8 mx-auto text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold">No active notifications found matching criteria</p>
                    <p className="text-[10px] text-slate-400">All caught up! System will populate notifications dynamically upon event releases.</p>
                  </div>
                ) : (
                  filteredNotifications.map((notif) => {
                    // Type Badge Colors
                    let badgeClass = "bg-blue-50 text-blue-700 border-blue-100";
                    if (notif.type === "Success") badgeClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (notif.type === "Warning") badgeClass = "bg-amber-50 text-amber-700 border-amber-100";
                    if (notif.type === "Critical") badgeClass = "bg-rose-50 text-rose-700 border-rose-100 animate-pulse";
                    if (notif.type === "Announcement") badgeClass = "bg-purple-50 text-purple-700 border-purple-100";

                    return (
                      <div 
                        key={notif.id} 
                        className={`p-4 hover:bg-slate-50/50 transition-colors flex gap-3 items-start ${
                          !notif.isRead ? "bg-[#0D2C6C]/[0.015] border-l-2 border-[#D4AF37]" : ""
                        }`}
                      >
                        {/* Status point */}
                        <div className="pt-1">
                          {!notif.isRead ? (
                            <span className="block w-2.5 h-2.5 rounded-full bg-[#D4AF37] shadow-sm animate-pulse"></span>
                          ) : (
                            <span className="block w-2 w-2 rounded-full bg-slate-300"></span>
                          )}
                        </div>

                        {/* Text Details */}
                        <div className="flex-grow space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${badgeClass}`}>
                              {notif.type}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono font-bold">
                              {new Date(notif.timestamp).toLocaleTimeString()} • {new Date(notif.timestamp).toLocaleDateString()}
                            </span>
                            <span className="text-[9px] bg-slate-100 text-slate-500 font-semibold px-1.5 py-0.2 rounded font-sans border border-slate-200/50">
                              {notif.channel}
                            </span>
                            {(() => {
                              const target = notif.targetUserId;
                              if (!target || target === "all" || target === "ALL_STAFF") {
                                return (
                                  <span className="text-[9px] bg-blue-50 text-blue-700 font-semibold px-1.5 py-0.2 rounded font-sans border border-blue-200/60 flex items-center gap-1">
                                    🌐 All Staff
                                  </span>
                                );
                              } else if (target === "owner") {
                                return (
                                  <span className="text-[9px] bg-amber-50 text-amber-700 font-semibold px-1.5 py-0.2 rounded font-sans border border-amber-200/60 flex items-center gap-1">
                                    🔒 Owner Only
                                  </span>
                                );
                              } else {
                                const targetUser = staffUsers.find(u => u.id === target || u.user_number === target || u.email === target);
                                const targetName = targetUser ? (targetUser.fullName || targetUser.name) : target;
                                return (
                                  <span className="text-[9px] bg-purple-50 text-purple-700 font-semibold px-1.5 py-0.2 rounded font-sans border border-purple-200/60 flex items-center gap-1">
                                    👤 Target: {targetName}
                                  </span>
                                );
                              }
                            })()}
                          </div>

                          <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                            {notif.title}
                          </h4>
                          <p className="text-xs text-slate-600 font-sans leading-relaxed">
                            {notif.message}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-1.5 shrink-0 self-center">
                          {!notif.isRead && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Mark Read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleArchive(notif.id)}
                            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Archive Alert"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Panel: Owner Command / Broadcast Center */}
          <div className="space-y-6">
            
            {/* Owner Message Center Form */}
            <div className="bg-gradient-to-b from-[#0D2C6C] to-[#071D4A] rounded-2xl p-5 text-white shadow-xl border border-blue-900/30 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-display font-extrabold text-sm tracking-wide">Owner Broadcast Center</h3>
                </div>
                <span className="text-[9px] font-mono bg-white/10 px-2 py-0.5 rounded border border-white/5 font-bold uppercase tracking-wider text-[#D4AF37]">
                  Owner Only
                </span>
              </div>
              <p className="text-[11px] text-white/70 leading-relaxed font-sans">
                Post notifications, critical alerts, or guidelines directly onto the team's live notification feed and local desktop trackers.
              </p>

              {(!currentUser || currentUser.role !== UserRole.OWNER) ? (
                <div className="bg-white/5 border border-white/10 p-3 rounded-xl flex items-center gap-2 text-xs text-[#D4AF37] font-semibold leading-relaxed">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>Access restricted to Practice Partners & Principal Owners.</span>
                </div>
              ) : (
                <form onSubmit={handleBroadcast} className="space-y-3">
                  {/* Select Type */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/75 uppercase tracking-wider">Broadcast Type</label>
                    <div className="grid grid-cols-3 gap-1">
                      {["Announcement", "Reminder", "Information"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setBroadcastType(t as any)}
                          className={`py-1 text-[10px] font-bold rounded-lg border cursor-pointer transition-all ${
                            broadcastType === t
                              ? "bg-[#D4AF37] text-[#0D2C6C] border-[#D4AF37]"
                              : "border-white/10 text-white/60 hover:bg-white/5"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/75 uppercase tracking-wider">Target Audience</label>
                    <select
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="w-full bg-blue-950/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37] font-sans"
                    >
                      <option value="all" className="bg-blue-950">Broadcast to All Staff</option>
                      <option value="owner" className="bg-blue-950">Confidential Owner Eyes Only</option>
                      {staffUsers.map(u => (
                        <option key={u.id} value={u.id} className="bg-blue-950">Target: {u.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Input Title */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/75 uppercase tracking-wider">Subject Title</label>
                    <input
                      type="text"
                      placeholder="Enter broadcast subject..."
                      value={broadcastTitle}
                      onChange={(e) => setBroadcastTitle(e.target.value)}
                      className="w-full bg-blue-950/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] font-sans"
                    />
                  </div>

                  {/* Input Message */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-white/75 uppercase tracking-wider">Detailed Message</label>
                    <textarea
                      placeholder="Compose detailed practice instruction..."
                      rows={3}
                      value={broadcastMessage}
                      onChange={(e) => setBroadcastMessage(e.target.value)}
                      className="w-full bg-blue-950/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] font-sans resize-none"
                    ></textarea>
                  </div>

                  {/* Pin Important Notice Toggle */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="pin_notice"
                      checked={broadcastPin}
                      onChange={(e) => setBroadcastPin(e.target.checked)}
                      className="rounded border-white/10 text-[#D4AF37] focus:ring-0 bg-blue-950 cursor-pointer"
                    />
                    <label htmlFor="pin_notice" className="text-[11px] text-white/80 font-bold select-none cursor-pointer flex items-center gap-1">
                      <Pin className="w-3 h-3 text-[#D4AF37]" /> Pin Important Notice to top
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="w-full bg-[#D4AF37] text-[#0D2C6C] font-bold text-xs py-2 rounded-xl flex items-center justify-center gap-1.5 hover:bg-[#c4a030] shadow-md transition-all mt-2 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Dispatch Broadcast Message
                  </button>
                </form>
              )}
            </div>

            {/* In-App Alerts Priority Card */}
            <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-3">
              <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-500" />
                Active Office Counters
              </h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-100">
                  <span className="block text-xl font-mono font-bold text-rose-700">
                    {notifications.filter(n => n.priority === "Critical" && !n.isRead).length}
                  </span>
                  <span className="text-[9px] text-rose-600 font-bold uppercase">Critical Pending</span>
                </div>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <span className="block text-xl font-mono font-bold text-amber-700">
                    {reminders.filter(r => r.status === "Overdue").length}
                  </span>
                  <span className="text-[9px] text-amber-600 font-bold uppercase">Overdue Tasks</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* SUB-WORKSPACE 2: RULES CONFIGURATOR */}
      {currentTab === "AUTOMATION" && (
        <div className="space-y-6">
          
          {/* Rules Configuration Console Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-5 h-5 text-[#D4AF37]" />
              <h3 className="font-display font-bold text-slate-800 text-sm">Automated Business Rules Engine</h3>
            </div>
            <p className="text-xs text-slate-500 max-w-4xl font-sans">
              The Rules Engine subscribes to events across JN OfficeOS directories. When triggers execute, configured chains (creating compliance reminders, dispatching in-app owner alerts, and logging timelines) run without direct module dependencies.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Rules Configuration List Panel */}
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/50">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Active Automation Pipelines</span>
                <span className="text-[10px] bg-slate-200 text-slate-600 font-bold px-2 py-0.5 rounded-full font-mono">
                  {rules.length} rules loaded
                </span>
              </div>

              <div className="space-y-4">
                {rules.map((rule) => {
                  const isEditing = editingRuleId === rule.id;

                  return (
                    <div 
                      key={rule.id}
                      className={`bg-white rounded-2xl p-5 border shadow-sm transition-all relative ${
                        rule.isEnabled 
                          ? "border-slate-100 hover:border-slate-300" 
                          : "border-slate-200 bg-slate-50/50 opacity-80"
                      }`}
                    >
                      {/* Priority strip */}
                      <div className={`absolute top-0 left-0 bottom-0 w-1 rounded-l-2xl ${
                        rule.priority === "Critical" ? "bg-rose-500" :
                        rule.priority === "High" ? "bg-amber-500" : "bg-blue-500"
                      }`}></div>

                      <div className="pl-2 space-y-3">
                        
                        {/* Header details */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold text-slate-400 font-mono">
                                ID: {rule.id.toUpperCase()}
                              </span>
                              <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-2 py-0.2 rounded font-sans uppercase">
                                TRIGGER: {rule.triggerEvent}
                              </span>
                              <span className={`text-[9px] font-bold px-2 py-0.2 rounded border ${
                                rule.priority === "Critical" ? "bg-rose-50 text-rose-700 border-rose-100" :
                                rule.priority === "High" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-blue-50 text-blue-700 border-blue-100"
                              }`}>
                                {rule.priority} Priority
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-800 tracking-tight">
                              {rule.name}
                            </h4>
                          </div>

                          {/* Toggle switch */}
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold font-mono ${rule.isEnabled ? "text-emerald-600 animate-pulse" : "text-slate-400"}`}>
                              {rule.isEnabled ? "ENABLED" : "DISABLED"}
                            </span>
                            <button
                              onClick={() => handleToggleRule(rule.id, rule.isEnabled)}
                              disabled={currentUser.role !== UserRole.OWNER}
                              className={`w-10 h-5 rounded-full p-0.5 transition-colors cursor-pointer focus:outline-none relative ${
                                rule.isEnabled ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                              title={currentUser.role !== UserRole.OWNER ? "Requires Partner permission to edit" : ""}
                            >
                              <div className={`w-4 h-4 rounded-full bg-white transition-transform ${rule.isEnabled ? "translate-x-5" : ""}`} />
                            </button>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 font-sans leading-relaxed">
                          {rule.description}
                        </p>

                        {/* Condition visual tags */}
                        {rule.conditions.length > 0 && (
                          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/40 text-[11px] font-sans flex items-center gap-2 text-slate-600">
                            <span className="font-bold text-[#0D2C6C] font-mono text-[9px] uppercase tracking-wider bg-[#0D2C6C]/5 px-2 py-0.5 rounded">Filter IF:</span>
                            {rule.conditions.map((cond, ci) => (
                              <span key={ci} className="font-mono font-semibold bg-slate-200/70 px-2 py-0.5 rounded text-slate-700">
                                {cond.field} {cond.operator.toUpperCase()} "{cond.value || "exists"}"
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Flow visual chain */}
                        <div className="space-y-1.5">
                          <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest font-sans">Automated Execution Sequence:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <div className="px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-200 text-[10px] font-semibold text-slate-600 font-mono">
                              Event Published
                            </div>
                            <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                            {rule.actions.map((act, ai) => (
                              <React.Fragment key={ai}>
                                <div className="px-2.5 py-1 bg-[#D4AF37]/10 text-[#0D2C6C] rounded-lg border border-[#D4AF37]/30 text-[10px] font-bold font-mono">
                                  {act.type === "GenerateAlert" ? "Generate Notification" : act.type}
                                </div>
                                {ai < rule.actions.length - 1 && (
                                  <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        {/* EDIT MODE CONTROLS */}
                        {isEditing ? (
                          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/50 grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Modify Trigger Event</label>
                              <select
                                value={editTrigger}
                                onChange={(e) => setEditTrigger(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                              >
                                <option value="CASE_CREATED">CASE_CREATED</option>
                                <option value="CASE_ASSIGNED">CASE_ASSIGNED</option>
                                <option value="CASE_COMPLETED">CASE_COMPLETED</option>
                                <option value="DOCUMENT_UPLOADED">DOCUMENT_UPLOADED</option>
                                <option value="DOCUMENT_VERIFIED">DOCUMENT_VERIFIED</option>
                                <option value="INVOICE_CREATED">INVOICE_CREATED</option>
                                <option value="PAYMENT_RECEIVED">PAYMENT_RECEIVED</option>
                                <option value="RECEIPT_GENERATED">RECEIPT_GENERATED</option>
                                <option value="WORKFLOW_STARTED">WORKFLOW_STARTED</option>
                                <option value="WORKFLOW_COMPLETED">WORKFLOW_COMPLETED</option>
                              </select>
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold text-slate-500 uppercase">Rule Execution Priority</label>
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as any)}
                                className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                              >
                                <option value="Low">Low</option>
                                <option value="Medium">Medium</option>
                                <option value="High">High</option>
                                <option value="Critical">Critical</option>
                              </select>
                            </div>

                            <div className="md:col-span-2 flex justify-end gap-2 pt-2 border-t border-slate-200">
                              <button
                                onClick={() => setEditingRuleId(null)}
                                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 rounded-lg text-xs font-bold text-slate-600 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => handleSaveRuleConfig(rule.id)}
                                className="px-3 py-1.5 bg-[#D4AF37] text-[#0D2C6C] hover:bg-[#c4a030] rounded-lg text-xs font-bold cursor-pointer"
                              >
                                Save Changes
                              </button>
                            </div>
                          </div>
                        ) : (
                          currentUser.role === UserRole.OWNER && (
                            <div className="flex justify-end pt-2 border-t border-slate-100">
                              <button
                                onClick={() => {
                                  setEditingRuleId(rule.id);
                                  setEditPriority(rule.priority);
                                  setEditTrigger(rule.triggerEvent);
                                }}
                                className="text-[11px] font-bold text-[#0D2C6C] hover:underline cursor-pointer flex items-center gap-1"
                              >
                                Configure Rule Parameters
                              </button>
                            </div>
                          )
                        )}

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Panel: Rule Engine Live Diagnostic Execution Log */}
            <div className="space-y-4">
              <div className="bg-[#0D2C6C]/5 p-4 rounded-2xl border border-slate-200/50 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-[#D4AF37]" />
                    Engine Run History
                  </h4>
                  <button
                    onClick={() => {
                      AutomationRepository.clearLogs();
                      loadAllData();
                    }}
                    className="text-[9px] font-bold text-rose-600 hover:underline cursor-pointer"
                  >
                    Clear Logs
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed font-sans">
                  Audits executed state machine iterations. Diagnoses successes, evaluation failures, or conditional skips in real-time.
                </p>
              </div>

              {/* Logs Stream */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {logs.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-1">
                    <Clock className="w-7 h-7 mx-auto text-slate-300 stroke-1" />
                    <p className="text-xs font-semibold">No run history recorded</p>
                    <p className="text-[10px]">Deploy system activities to watch active rules fire in real-time.</p>
                  </div>
                ) : (
                  logs.map((log) => {
                    let statusClass = "bg-emerald-50 text-emerald-700 border-emerald-100";
                    if (log.status === "Failed") statusClass = "bg-rose-50 text-rose-700 border-rose-100";
                    if (log.status === "Skipped") statusClass = "bg-slate-100 text-slate-600 border-slate-200";

                    return (
                      <div key={log.id} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between flex-wrap gap-1">
                          <span className="font-bold text-slate-700 truncate max-w-[150px] font-sans">
                            {log.ruleName}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${statusClass}`}>
                            {log.status}
                          </span>
                        </div>

                        <p className="text-[11px] text-slate-500 font-sans">
                          {log.details}
                        </p>

                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mt-1">
                          <span>Event: {log.eventType}</span>
                          <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

          </div>

        </div>
      )}

      {/* SUB-WORKSPACE 3: COMPLIANCE REMINDER ENGINE */}
      {currentTab === "REMINDERS" && (
        <div className="space-y-6">
          
          {/* Header */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <CalendarClock className="w-5 h-5 text-[#D4AF37]" />
                <h3 className="font-display font-bold text-slate-800 text-sm">Practice Compliance & Renewal Reminder Directory</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl font-sans">
                Manage due dates, upcoming professional filings, client document expirations, and private assignments with targeted alert triggers.
              </p>
            </div>

            <button
              onClick={() => setShowReminderModal(true)}
              className="bg-[#0D2C6C] text-[#D4AF37] hover:bg-[#091f4d] border border-[#D4AF37]/30 font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Schedule Compliance Reminder
            </button>
          </div>

          {/* Filters Bar */}
          <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-none">
            {["ALL", "Pending", "Overdue", "Completed"].map((f) => {
              const count = f === "ALL" ? reminders.length :
                            f === "Pending" ? reminders.filter(r => r.status === "Pending").length :
                            f === "Overdue" ? reminders.filter(r => r.status === "Overdue").length :
                            reminders.filter(r => r.status === "Completed").length;

              return (
                <button
                  key={f}
                  onClick={() => setReminderFilter(f as any)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                    reminderFilter === f
                      ? "bg-[#0D2C6C] text-white"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                  }`}
                >
                  {f} Reminder
                  <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                    reminderFilter === f ? "bg-white/20 text-white" : "bg-slate-200 text-slate-600"
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reminders Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reminders.filter(rem => reminderFilter === "ALL" || rem.status === reminderFilter).length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl p-12 border border-slate-100 text-center space-y-3">
                <CalendarClock className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                <p className="text-xs font-bold text-slate-500">No active compliance reminders are recorded in this state</p>
                <p className="text-[10px] text-slate-400">Click "Schedule Compliance Reminder" to initiate a target track.</p>
              </div>
            ) : (
              reminders.filter(rem => reminderFilter === "ALL" || rem.status === reminderFilter).map((rem) => {
                
                // Style variables
                let categoryColor = "bg-blue-50 text-blue-700 border-blue-100";
                if (rem.category === "Compliance") categoryColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                if (rem.category === "Payment Due") categoryColor = "bg-amber-50 text-amber-700 border-amber-100";
                if (rem.category === "Document Expiry") categoryColor = "bg-rose-50 text-rose-700 border-rose-100";
                
                let borderClass = "border-slate-100 bg-white";
                if (rem.status === "Overdue") borderClass = "border-rose-200 bg-rose-50/10";
                if (rem.status === "Completed") borderClass = "border-slate-200 bg-slate-50/60 opacity-70";

                return (
                  <div key={rem.id} className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between gap-4 transition-all ${borderClass}`}>
                    
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${categoryColor}`}>
                          {rem.category}
                        </span>
                        
                        <div className="flex items-center gap-1">
                          <Clock className={`w-3.5 h-3.5 ${
                            rem.status === "Overdue" ? "text-rose-500 animate-pulse" :
                            rem.status === "Completed" ? "text-slate-400" : "text-amber-500"
                          }`} />
                          <span className={`text-[10px] font-mono font-bold ${
                            rem.status === "Overdue" ? "text-rose-600" :
                            rem.status === "Completed" ? "text-slate-500" : "text-slate-600"
                          }`}>
                            Due: {rem.dueDate} {rem.status === "Overdue" && " (Overdue)"}
                          </span>
                        </div>
                      </div>

                      <h4 className={`text-xs font-bold leading-tight ${rem.status === "Completed" ? "line-through text-slate-400" : "text-slate-800"}`}>
                        {rem.title}
                      </h4>
                      
                      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                        {rem.description}
                      </p>

                      {rem.clientName && (
                        <div className="text-[10px] bg-slate-50 p-1.5 rounded border border-slate-200/50 text-slate-600 font-sans">
                          <span className="font-bold">Client:</span> {rem.clientName}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100/80 text-[10px]">
                      <span className="text-slate-400 font-mono">ID: {String(rem.id || "").toUpperCase()}</span>
                      
                      <div className="flex items-center gap-2">
                        {rem.status !== "Completed" ? (
                          <button
                            onClick={() => handleCompleteReminder(rem.id)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 transition-colors cursor-pointer"
                          >
                            Mark Completed
                          </button>
                        ) : (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Checked Out
                          </span>
                        )}
                        
                        <button
                          onClick={() => handleDeleteReminder(rem.id)}
                          className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Reminder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Reminder Creation Modal Popup */}
          {showReminderModal && (
            <div className="fixed inset-0 bg-slate-900/35 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-6 w-full max-w-md shadow-2xl space-y-4 animate-fade-in">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="font-display font-bold text-slate-800 text-sm flex items-center gap-1.5">
                    <CalendarClock className="w-4 h-4 text-[#D4AF37]" />
                    Schedule Practice Reminder
                  </h3>
                  <button onClick={() => setShowReminderModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleCreateReminder} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Reminder Category</label>
                    <select
                      value={newRemCategory}
                      onChange={(e) => setNewRemCategory(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    >
                      <option value="Compliance">Compliance Deadline</option>
                      <option value="Renewals">Filing / DSC Renewal</option>
                      <option value="Payment Due">Outstanding Payment Follow-up</option>
                      <option value="Document Expiry">Document Expiration Check</option>
                      <option value="Client Follow-up">Client Advisory Touchpoint</option>
                      <option value="Owner Task">Owner Partner Directive</option>
                      <option value="Staff Task">Staff Executive Action</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subject Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Income Tax Return Filing Form 3"
                      value={newRemTitle}
                      onChange={(e) => setNewRemTitle(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Target Due Date</label>
                    <input
                      type="date"
                      value={newRemDueDate}
                      onChange={(e) => setNewRemDueDate(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Client Context Name (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Acme Tech Solutions"
                      value={newRemClient}
                      onChange={(e) => setNewRemClient(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Action Assignment (Optional)</label>
                    <select
                      value={newRemAssignee}
                      onChange={(e) => setNewRemAssignee(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    >
                      <option value="">No staff assignment (Global/Owner)</option>
                      {staffUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Instructions</label>
                    <textarea
                      placeholder="Details regarding filing codes, logs, etc..."
                      rows={3}
                      value={newRemDesc}
                      onChange={(e) => setNewRemDesc(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-sans resize-none focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                    ></textarea>
                  </div>

                  <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowReminderModal(false)}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-xs font-bold text-slate-500 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-[#0D2C6C] text-[#D4AF37] hover:bg-[#071d44] rounded-lg text-xs font-bold cursor-pointer"
                    >
                      Establish Task
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* SUB-WORKSPACE 4: TELEMETRY & GOOGLE SHEETS SCHEMAS */}
      {currentTab === "TELEMETRY" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Panel: Real-Time Published Event Stream (Complete History) */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-5 h-5 text-[#D4AF37]" />
                  <h3 className="font-display font-bold text-slate-800 text-sm">Real-Time Event Stream History</h3>
                </div>
                <span className="text-[9px] font-mono bg-[#0D2C6C]/10 text-[#0D2C6C] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                  Complete Stream Log
                </span>
              </div>
              <p className="text-xs text-slate-500 font-sans">
                Below is the historical audit trail of the event-driven system architecture. As you trigger case updates, upload files, or broadcast announcements, events are logged here and fed directly to rules.
              </p>
            </div>

            {/* Event List */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-50 flex items-center justify-between bg-slate-50/40 text-xs">
                <span className="font-bold text-slate-600 font-sans">Published Event Log Stream (No-Auto-Delete)</span>
                <span className="font-bold text-slate-400 font-mono">{events.length} system packets logged</span>
              </div>

              <div className="divide-y divide-slate-100 max-h-[450px] overflow-y-auto">
                {events.map((evt) => {
                  let badgeColor = "bg-blue-50 text-blue-700 border-blue-100";
                  if (evt.type.includes("CREATED") || evt.type.includes("LOGIN")) badgeColor = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  if (evt.type.includes("COMPLETED")) badgeColor = "bg-purple-50 text-purple-700 border-purple-100";
                  if (evt.type.includes("ALERT") || evt.type.includes("WARNING")) badgeColor = "bg-rose-50 text-rose-700 border-rose-100";

                  return (
                    <div key={evt.id} className="p-3.5 hover:bg-slate-50/30 flex gap-3 items-start text-xs font-mono">
                      <span className="text-[10px] bg-slate-100 border border-slate-200/60 rounded px-1.5 py-0.5 font-bold text-slate-500 self-start shrink-0">
                        {evt.source.toUpperCase()}
                      </span>

                      <div className="flex-grow space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${badgeColor}`}>
                            {evt.type}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold">
                            {new Date(evt.timestamp).toLocaleTimeString()}
                          </span>
                        </div>

                        {evt.userEmail && (
                          <div className="text-[10px] text-slate-500 font-sans font-semibold">
                            Actor: {evt.userName || evt.userEmail} ({evt.userEmail})
                          </div>
                        )}

                        <div className="bg-slate-50 p-2 rounded border border-slate-200/50 mt-1.5 text-[10px] leading-relaxed text-slate-700 overflow-x-auto max-w-full">
                          <span className="font-bold text-blue-900 block mb-0.5">Payload Data Packet:</span>
                          {JSON.stringify(evt.payload, null, 2)}
                        </div>
                      </div>

                      <span className="text-[9px] text-slate-400 shrink-0 select-all">
                        {evt.id}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Panel: Supabase Schemas & Specifications */}
          <div className="space-y-6">
            
            {/* Supabase Connection Status Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-emerald-600" />
                <h3 className="font-display font-bold text-slate-800 text-xs uppercase tracking-wider">Supabase Cloud Engine</h3>
              </div>
              <p className="text-xs text-slate-500 font-sans leading-relaxed">
                JN OfficeOS architecture runs with Supabase PostgreSQL as the authoritative Source of Truth. Automations and Realtime Event channels trigger directly from backend database events.
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Database Protocol</span>
                  <span className="text-xs text-[#0D2C6C] font-extrabold font-sans">Supabase PostgreSQL 15+ Active</span>
                </div>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" title="Supabase Connected"></span>
              </div>
            </div>

            {/* Schemas breakdown */}
            <div className="bg-[#0D2C6C] text-white p-5 rounded-2xl shadow-lg border border-blue-950/20 space-y-4">
              <h3 className="font-display font-extrabold text-xs uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Repository Schemas
              </h3>

              <div className="space-y-3.5 text-[11px] font-mono leading-relaxed text-white/80">
                <div className="border-b border-white/10 pb-2">
                  <span className="block font-bold text-white uppercase text-[10px]">1. Notifications Table Schema</span>
                  <p className="text-[10px] text-white/60 mb-1">Table: "jn_notifications"</p>
                  <span className="text-[#D4AF37]">Columns:</span> id, timestamp, type, title, message, channel, isRead, isArchived, priority, targetUserId, metadata (JSON)
                </div>

                <div className="border-b border-white/10 pb-2">
                  <span className="block font-bold text-white uppercase text-[10px]">2. Automation Rules Table Schema</span>
                  <p className="text-[10px] text-white/60 mb-1">Table: "jn_automation_rules"</p>
                  <span className="text-[#D4AF37]">Columns:</span> id, name, description, triggerEvent, conditions (JSON), actions (JSON), isEnabled, priority, createdAt, updatedAt
                </div>

                <div>
                  <span className="block font-bold text-white uppercase text-[10px]">3. Reminders Table Schema</span>
                  <p className="text-[10px] text-white/60 mb-1">Table: "jn_reminders"</p>
                  <span className="text-[#D4AF37]">Columns:</span> id, title, description, category, dueDate, status, assignedToId, createdAt, completedAt, clientId, clientName, caseId
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </WorkspaceLayout>
  );
}
