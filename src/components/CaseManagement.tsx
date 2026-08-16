/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Search, Filter, Calendar, FileText, Check, X, Shield, Clock, Database, 
  Sparkles, FileSpreadsheet, Lock, AlertCircle, Landmark, FolderOpen, CalendarDays, 
  Receipt, BarChart3, UserCheck, AlertOctagon, HelpCircle, ChevronRight, Download, 
  Eye, CornerDownRight, PlusCircle, Trash, Trash2, Send, CheckCircle2, ChevronDown,
  RefreshCw
} from "lucide-react";
import { User, UserRole, Client, Service, Case, CasePriority, CaseStatus, CaseChecklistItem, CaseAttachment, CaseNote } from "../types";
import { getClients, getServices, getUsers, getWorkflows, saveWorkflows, getNextWorkflowId } from "../lib/db";
import { CaseRepository } from "../lib/repository";
import { hasPermission } from "../lib/permissions";
import { WorkspaceLayout } from "./WorkspaceLayout";

interface CaseManagementProps {
  currentUser: User;
  onAddAuditLog: (
    email: string,
    name: string,
    role: UserRole,
    action: string,
    category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM",
    details: string
  ) => void;
}

export default function CaseManagement({ currentUser, onAddAuditLog }: CaseManagementProps) {
  const isOwner = currentUser.role === UserRole.OWNER;
  
  // Data Lists
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  
  // Active Case Detail View
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterStaff, setFilterStaff] = useState<string>("ALL");
  const [filterService, setFilterService] = useState<string>("ALL");
  const [filterDate, setFilterDate] = useState<string>("ALL"); // "ALL", "TODAY", "WEEK", "OVERDUE"

  // Modals & Forms State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);

  // New Case Form state
  const [newCaseClientId, setNewCaseClientId] = useState("");
  const [newCaseServiceId, setNewCaseServiceId] = useState("");
  const [newCasePriority, setNewCasePriority] = useState<CasePriority>("Medium");
  const [newCaseExpectedDate, setNewCaseExpectedDate] = useState("");
  const [newCaseStaffIds, setNewCaseStaffIds] = useState<string[]>([]);
  const [customChecklistItems, setCustomChecklistItems] = useState<string[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState("");

  // Invoice Form state
  const [invoiceSubtotal, setInvoiceSubtotal] = useState<number>(0);
  const [invoiceGstRate, setInvoiceGstRate] = useState<number>(18);
  const [invoiceDueDate, setInvoiceDueDate] = useState("");
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Payment Form state
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState("UPI Transfer");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Attachment Form state
  const [attachFileName, setAttachFileName] = useState("");
  const [attachCategory, setAttachCategory] = useState<CaseAttachment["category"]>("Other");
  const [attachFilePayload, setAttachFilePayload] = useState("base64_simulated_payload_data");

  // New Note State
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<CaseNote["type"]>("STAFF");

  // Load and refresh state
  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const refreshData = () => {
    const loadedCases = CaseRepository.getCases(currentUser);
    setCases(loadedCases);
    setClients(getClients().filter(c => c.status === "Active"));
    setServices(getServices().filter(s => s.status === "Active"));
    setStaffUsers(getUsers().filter(u => u.status === "ACTIVE" && u.role === UserRole.STAFF));
  };

  const getSelectedCase = (): Case | null => {
    if (!selectedCaseId) return null;
    return cases.find(c => c.id === selectedCaseId) || null;
  };

  // Create Case Handler
  const handleCreateCase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCaseClientId || !newCaseServiceId || !newCaseExpectedDate) {
      alert("Please configure Client, Service, and Target Completion Date.");
      return;
    }

    const selectedClient = clients.find(c => c.id === newCaseClientId);
    const selectedService = services.find(s => s.id === newCaseServiceId);

    if (!selectedClient || !selectedService) return;

    try {
      const created = CaseRepository.createCase(
        selectedClient.id,
        selectedClient.name,
        selectedService.id,
        selectedService.name,
        selectedService.category,
        newCaseStaffIds,
        newCasePriority,
        newCaseExpectedDate,
        customChecklistItems.length > 0 ? customChecklistItems : null,
        currentUser
      );

      // Automated Sync to Compliance Workflow Engine
      // Check if a template exists for this service and start an active workflow
      const linkedWorkflowId = `WF_${Date.now()}`;
      try {
        const activeWorkflows = getWorkflows();
        const newWf = {
          id: getNextWorkflowId(),
          clientId: selectedClient.id,
          clientName: selectedClient.name,
          serviceId: selectedService.id,
          serviceName: selectedService.name,
          serviceCode: selectedService.code || "SRV-COMP",
          templateId: "WFT0001", // fallback
          currentStageIndex: 0,
          status: "Pending" as const,
          requiredDocuments: [
            { name: "PAN", status: "Pending" as const },
            { name: "Aadhaar", status: "Pending" as const }
          ],
          tasks: [
            { id: `t1_${Date.now()}`, title: "Initial Verification", assignedStaffId: newCaseStaffIds[0] || "", assignedStaffName: "", dueDate: newCaseExpectedDate, priority: newCasePriority, status: "Pending" as const, createdAt: new Date().toISOString() }
          ],
          timeline: [
            { id: `e1_${Date.now()}`, timestamp: new Date().toISOString(), title: "Filing Case Initialized", details: `Linked to Enterprise Case ${created.id}`, userEmail: currentUser.email, userName: currentUser.name }
          ],
          notes: [],
          assignedStaffId: newCaseStaffIds[0] || "",
          assignedStaffName: "",
          dueDate: newCaseExpectedDate,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        activeWorkflows.unshift(newWf);
        saveWorkflows(activeWorkflows);
        
        // Link workflow back to the created Case
        CaseRepository.updateCase(created.id, { workflowId: newWf.id }, currentUser);
      } catch (err) {
        console.error("Workflow link skipped: ", err);
      }

      refreshData();
      setIsCreateModalOpen(false);
      setSelectedCaseId(created.id);
      
      // Clear form
      setNewCaseClientId("");
      setNewCaseServiceId("");
      setNewCasePriority("Medium");
      setNewCaseExpectedDate("");
      setNewCaseStaffIds([]);
      setCustomChecklistItems([]);
    } catch (err: any) {
      alert(err.message || "Error creating case.");
    }
  };

  // Add custom checklist item
  const addChecklistItem = () => {
    if (!newChecklistInput.trim()) return;
    setCustomChecklistItems([...customChecklistItems, newChecklistInput.trim()]);
    setNewChecklistInput("");
  };

  // Remove checklist item
  const removeChecklistItem = (idx: number) => {
    setCustomChecklistItems(customChecklistItems.filter((_, i) => i !== idx));
  };

  // Update Case parameters (Status, priority, etc)
  const handleUpdateCaseStatus = (caseId: string, status: CaseStatus) => {
    try {
      CaseRepository.updateCase(caseId, { status }, currentUser);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCasePriority = (caseId: string, priority: CasePriority) => {
    try {
      CaseRepository.updateCase(caseId, { priority }, currentUser);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateCaseStaff = (caseId: string, assignedStaffIds: string[]) => {
    try {
      CaseRepository.updateCase(caseId, { assignedStaffIds }, currentUser);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Toggle checklist item status
  const handleToggleChecklist = (caseId: string, itemId: string, completed: boolean) => {
    try {
      CaseRepository.toggleChecklistItem(caseId, itemId, completed, currentUser);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Note handler
  const handleAddNote = (e: React.FormEvent, caseId: string) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;
    try {
      CaseRepository.addCaseNote(caseId, newNoteType, newNoteContent.trim(), currentUser);
      setNewNoteContent("");
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Attachment handler
  const handleAddAttachment = (e: React.FormEvent, caseId: string) => {
    e.preventDefault();
    if (!attachFileName.trim()) {
      alert("Please provide file name");
      return;
    }
    try {
      CaseRepository.addCaseAttachment(
        caseId,
        attachFileName,
        "pdf",
        attachCategory,
        attachFilePayload,
        currentUser
      );
      setAttachFileName("");
      setIsAttachmentModalOpen(false);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Invoice generator handler
  const handleGenerateInvoice = async (e: React.FormEvent, caseId: string) => {
    e.preventDefault();
    if (invoiceSubtotal <= 0 || !invoiceDueDate) {
      alert("Please configure taxable subtotal and due date.");
      return;
    }
    setIsSubmittingInvoice(true);
    try {
      const res = await CaseRepository.generateCaseInvoiceAsync(
        caseId,
        invoiceDueDate,
        invoiceSubtotal,
        invoiceGstRate,
        currentUser
      );
      if (!res.success) {
        alert(`Invoice Generation Failed: ${res.error || "Failed to generate central invoice."}`);
        setIsSubmittingInvoice(false);
        return;
      }
      setIsInvoiceModalOpen(false);
      refreshData();
    } catch (err: any) {
      alert(`Invoice Generation Error: ${err.message}`);
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  // Payment Handler
  const handleAddPayment = async (e: React.FormEvent, caseId: string) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert("Payment amount must be greater than zero.");
      return;
    }
    setIsSubmittingPayment(true);
    try {
      const res = await CaseRepository.addCasePaymentAsync(
        caseId,
        paymentAmount,
        paymentMode,
        paymentRef,
        paymentRemarks,
        currentUser
      );
      if (!res.success) {
        alert(`Payment Recording Failed: ${res.error || "Failed to record payment in central ledger."}`);
        setIsSubmittingPayment(false);
        return;
      }
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentRef("");
      setPaymentRemarks("");
      refreshData();
    } catch (err: any) {
      alert(`Payment Recording Error: ${err.message}`);
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Filtering Logic
  const filteredCases = cases.filter(c => {
    // 1. Search Query
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      c.id.toLowerCase().includes(query) ||
      c.clientName.toLowerCase().includes(query) ||
      c.serviceName.toLowerCase().includes(query) ||
      c.serviceType.toLowerCase().includes(query) ||
      c.assignedStaffIds.some(sid => {
        const staff = staffUsers.find(u => u.id === sid);
        return staff && staff.name.toLowerCase().includes(query);
      });

    // 2. Status Filter
    const matchesStatus = filterStatus === "ALL" || c.status === filterStatus;

    // 3. Priority Filter
    const matchesPriority = filterPriority === "ALL" || c.priority === filterPriority;

    // 4. Staff Filter
    const matchesStaff = filterStaff === "ALL" || c.assignedStaffIds.includes(filterStaff);

    // 5. Service Filter
    const matchesService = filterService === "ALL" || c.serviceType === filterService;

    // 6. Date Filter
    let matchesDate = true;
    if (filterDate === "TODAY") {
      const todayStr = new Date().toISOString().split("T")[0];
      matchesDate = c.createdAt.startsWith(todayStr);
    } else if (filterDate === "OVERDUE") {
      const today = new Date();
      const expected = new Date(c.expectedCompletionDate);
      matchesDate = c.status !== "Completed" && expected < today;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesStaff && matchesService && matchesDate;
  });

  // KPI Calculations
  const stats = {
    total: filteredCases.length,
    pendingDocs: filteredCases.filter(c => c.status === "Documents Pending").length,
    processing: filteredCases.filter(c => ["Work Started", "Under Processing", "Filed"].includes(c.status)).length,
    completed: filteredCases.filter(c => c.status === "Completed").length,
    totalBilled: filteredCases.reduce((sum, c) => sum + (c.invoice ? c.invoice.totalAmount : 0), 0),
    totalCollected: filteredCases.reduce((sum, c) => {
      if (!c.invoice) return sum;
      return sum + c.invoice.payments.reduce((pSum, p) => pSum + p.amount, 0);
    }, 0)
  };

  const getPriorityBadgeClass = (priority: CasePriority) => {
    switch (priority) {
      case "Critical":
        return "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 font-bold";
      case "High":
        return "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 font-bold";
      case "Medium":
        return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100";
    }
  };

  const getStatusBadgeClass = (status: CaseStatus) => {
    switch (status) {
      case "Completed":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 font-bold";
      case "Cancelled":
        return "bg-slate-100 text-slate-600 border-slate-200";
      case "On Hold":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Ready":
        return "bg-teal-50 text-teal-700 border-teal-200 font-bold animate-pulse";
      case "Documents Pending":
        return "bg-violet-50 text-violet-700 border-violet-200";
      case "Work Started":
      case "Under Processing":
      case "Filed":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
      default:
        return "bg-blue-50 text-blue-700 border-blue-100";
    }
  };

  const selectedCase = getSelectedCase();

  return (
    <WorkspaceLayout id="case_management_container">
      
      {/* Dynamic Upper Sub-Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5" id="case_management_header">
        <div>
          <h1 className="font-display font-extrabold text-2xl text-[#0D2C6C] flex items-center gap-2.5">
            <span className="p-2 bg-[#0D2C6C]/5 text-[#0D2C6C] rounded-xl border border-[#0D2C6C]/10">
              <Database className="w-5.5 h-5.5" />
            </span>
            Enterprise Case Directory
          </h1>
          <p className="text-xs text-slate-500 font-medium tracking-wide mt-1">
            Standardizing client briefs into persistent compliant workflows. Invoices and sheets integrated.
          </p>
        </div>

        {isOwner && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 bg-[#D4AF37] hover:bg-[#c29e2f] text-[#0D2C6C] font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            id="btn_create_new_case"
          >
            <Plus className="w-4 h-4 text-[#0D2C6C]" />
            Initiate Corporate Case
          </button>
        )}
      </div>

      {/* KPI Stats Band */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4" id="case_management_kpis">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Active Cases</span>
          <span className="text-xl font-extrabold text-[#0D2C6C] mt-2">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest">Documents Pending</span>
          <span className="text-xl font-extrabold text-violet-600 mt-2">{stats.pendingDocs}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-blue-400 uppercase tracking-widest">Work Processing</span>
          <span className="text-xl font-extrabold text-blue-600 mt-2">{stats.processing}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-widest">Completed Files</span>
          <span className="text-xl font-extrabold text-emerald-600 mt-2">{stats.completed}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <span className="text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">Case Billing (INR)</span>
          <span className="text-base font-extrabold text-[#0D2C6C] mt-2">₹{stats.totalBilled.toLocaleString("en-IN")}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between border-l-4 border-l-emerald-500">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Collected</span>
          <span className="text-base font-extrabold text-emerald-600 mt-2">₹{stats.totalCollected.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Main Panel grid (Filter/Search + Table | Detail View) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="case_management_workspace">
        
        {/* Left Side: Search, Filters, and Interactive Table */}
        <div className={`${selectedCaseId ? "xl:col-span-7" : "xl:col-span-12"} space-y-4`}>
          
          {/* Advanced Filtering Suite */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm space-y-3.5" id="case_filters_panel">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-grow">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  placeholder="Search by case number, client, service code, assigned staff name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-[#D4AF37] rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-700"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="flex items-center gap-1 px-3 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-bold uppercase tracking-wider">
                  <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
                  Filters
                </span>
                <button
                  onClick={() => {
                    setFilterStatus("ALL");
                    setFilterPriority("ALL");
                    setFilterStaff("ALL");
                    setFilterService("ALL");
                    setFilterDate("ALL");
                    setSearchQuery("");
                  }}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2 py-1.5 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Quick dropdown selectors */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5">
              
              {/* Status */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Draft">Draft</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Documents Pending">Docs Pending</option>
                  <option value="Ready">Ready</option>
                  <option value="Work Started">Work Started</option>
                  <option value="Under Processing">In Progress</option>
                  <option value="Filed">Filed</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">All Priorities</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              {/* Staff */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Assigned Staff</label>
                <select
                  value={filterStaff}
                  onChange={(e) => setFilterStaff(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">All Staff</option>
                  {staffUsers.map(st => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Service Type */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Service Type</label>
                <select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">All Services</option>
                  <option value="GST">GST</option>
                  <option value="Income Tax">Income Tax</option>
                  <option value="Audit">Audit</option>
                  <option value="Food Licence">Food Licence</option>
                  <option value="TDS">TDS</option>
                </select>
              </div>

              {/* Target / Created */}
              <div>
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1 pl-1">Timelines</label>
                <select
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-full text-[10px] font-bold text-slate-600 border border-slate-200 rounded-lg p-2 bg-slate-50 outline-none focus:border-[#D4AF37]"
                >
                  <option value="ALL">All Dates</option>
                  <option value="TODAY">Created Today</option>
                  <option value="OVERDUE">Overdue Target</option>
                </select>
              </div>

            </div>
          </div>

          {/* Table Directory Card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="case_table_card">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Case Registry Records ({filteredCases.length})</span>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#D4AF37] bg-[#0D2C6C] px-2 py-1 rounded-md">
                <Database className="w-3.5 h-3.5 shrink-0" />
                <span>Google Sheets Sync Active</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-100">
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Case Details</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Category</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Staff Assignment</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Priority</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                    <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Invoiced</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredCases.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-xs font-semibold text-slate-400">
                        No active Cases found matching selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCases.map(c => {
                      const isAssignedToMe = c.assignedStaffIds.includes(currentUser.id);
                      return (
                        <tr
                          key={c.id}
                          onClick={() => setSelectedCaseId(selectedCaseId === c.id ? null : c.id)}
                          className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${selectedCaseId === c.id ? "bg-amber-50/20 hover:bg-amber-50/30 border-l-4 border-l-[#D4AF37]" : ""}`}
                        >
                          <td className="p-3">
                            <div className="font-mono font-extrabold text-[11px] text-[#0D2C6C] tracking-wide">{c.id}</div>
                            <div className="font-semibold text-xs text-slate-700 tracking-tight mt-0.5 line-clamp-1">{c.clientName}</div>
                            <div className="text-[10px] font-medium text-slate-400 mt-1 flex items-center gap-1">
                              <CalendarDays className="w-3.5 h-3.5 text-slate-300" />
                              <span>Target: {c.expectedCompletionDate}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="inline-block text-[10px] font-bold text-[#0D2C6C] bg-blue-50/60 px-2 py-0.5 rounded-md border border-blue-100">
                              {c.serviceType}
                            </span>
                            <div className="text-[10px] font-medium text-slate-500 mt-1 line-clamp-1">{c.serviceName}</div>
                          </td>

                          <td className="p-3">
                            {c.assignedStaffIds.length === 0 ? (
                              <span className="text-[10px] font-bold text-slate-400 italic">Unassigned</span>
                            ) : (
                              <div className="space-y-0.5">
                                {Array.from(new Set(c.assignedStaffIds)).map((sid, idx) => {
                                  const staff = staffUsers.find(u => u.id === sid);
                                  return (
                                    <div key={`${c.id}-${sid}-${idx}`} className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0"></span>
                                      {staff?.name || "Senior Consultant"}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-center">
                            <span className={`inline-block border px-2 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${getPriorityBadgeClass(c.priority)}`}>
                              {c.priority}
                            </span>
                          </td>

                          <td className="p-3 text-center">
                            <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[9px] font-extrabold tracking-wide uppercase ${getStatusBadgeClass(c.status)}`}>
                              {c.status}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            {c.invoice ? (
                              <div className="space-y-0.5">
                                <div className="text-[11px] font-extrabold text-[#0D2C6C]">₹{c.invoice.totalAmount.toLocaleString("en-IN")}</div>
                                <span className={`inline-block text-[8px] font-extrabold px-1 rounded uppercase tracking-wider ${c.invoice.status === "PAID" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800 animate-pulse"}`}>
                                  {c.invoice.status}
                                </span>
                              </div>
                            ) : (
                              <span className="text-[10px] font-medium text-slate-400">None Raised</span>
                            )}
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Right Side: Interactive Details View (Drawer style) */}
        {selectedCase && (
          <div className="col-span-1 xl:col-span-5 space-y-5" id="case_details_panel">
            
            {/* Upper case meta details card */}
            <div className="bg-[#0D2C6C] text-white p-5 rounded-2xl border border-blue-950/20 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-extrabold text-xs text-[#D4AF37] tracking-wider uppercase border border-[#D4AF37]/30 px-2 py-0.5 rounded-lg bg-white/5">{selectedCase.id}</span>
                    <span className="inline-block bg-white/10 text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/5 uppercase tracking-wide">{selectedCase.priority} Priority</span>
                  </div>
                  <h2 className="font-display font-extrabold text-base text-white tracking-tight leading-snug line-clamp-2 mt-2">{selectedCase.clientName}</h2>
                </div>
                <button
                  onClick={() => setSelectedCaseId(null)}
                  className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white cursor-pointer self-start"
                >
                  <X className="w-4.5 h-4.5" />
                </button>
              </div>

              {/* Key fields & update selectors */}
              <div className="grid grid-cols-2 gap-3.5 bg-white/5 p-3.5 rounded-xl border border-white/5 text-xs">
                
                <div>
                  <span className="block text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest">Compliance Field</span>
                  <span className="font-extrabold text-white mt-1 block">{selectedCase.serviceType} • {selectedCase.serviceName}</span>
                </div>

                <div>
                  <span className="block text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest">Expected Completion</span>
                  <span className="font-extrabold text-white mt-1 block">{selectedCase.expectedCompletionDate}</span>
                </div>

                {/* Status Dropdown */}
                <div>
                  <span className="block text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">Action Status</span>
                  <select
                    value={selectedCase.status}
                    onChange={(e) => handleUpdateCaseStatus(selectedCase.id, e.target.value as CaseStatus)}
                    className="w-full text-[10px] font-bold bg-[#071D4A] border border-white/15 rounded-lg p-1.5 outline-none focus:border-[#D4AF37] text-white cursor-pointer"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Assigned">Assigned</option>
                    <option value="Documents Pending">Documents Pending</option>
                    <option value="Ready">Ready</option>
                    <option value="Work Started">Work Started</option>
                    <option value="Under Processing">Under Processing</option>
                    <option value="Filed">Filed</option>
                    <option value="Completed">Completed</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="On Hold">On Hold</option>
                  </select>
                </div>

                {/* Priority Selector */}
                <div>
                  <span className="block text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest mb-1.5">Level Priority</span>
                  <select
                    value={selectedCase.priority}
                    onChange={(e) => handleUpdateCasePriority(selectedCase.id, e.target.value as CasePriority)}
                    className="w-full text-[10px] font-bold bg-[#071D4A] border border-white/15 rounded-lg p-1.5 outline-none focus:border-[#D4AF37] text-white cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

              </div>

              {/* Staff Assignments checklist/view */}
              <div className="space-y-1.5">
                <span className="block text-[8px] font-bold text-white/50 uppercase tracking-widest">Staff Assignments ({selectedCase.assignedStaffIds.length})</span>
                {isOwner ? (
                  <div className="flex flex-wrap gap-1.5 p-2 bg-[#071D4A] border border-white/10 rounded-xl">
                    {staffUsers.map(st => {
                      const isAssigned = selectedCase.assignedStaffIds.includes(st.id);
                      return (
                        <button
                          key={st.id}
                          onClick={() => {
                            const nextIds = isAssigned
                              ? selectedCase.assignedStaffIds.filter(id => id !== st.id)
                              : [...selectedCase.assignedStaffIds, st.id];
                            handleUpdateCaseStaff(selectedCase.id, nextIds);
                          }}
                          className={`text-[9px] font-bold px-2 py-1 rounded-md transition-all border cursor-pointer ${isAssigned ? "bg-[#D4AF37] text-[#0D2C6C] border-[#D4AF37]" : "bg-white/5 text-white/60 border-white/10 hover:bg-white/10"}`}
                        >
                          {st.name}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(selectedCase.assignedStaffIds)).map((sid, idx) => {
                      const staff = staffUsers.find(u => u.id === sid);
                      return (
                        <span key={`${selectedCase.id}-${sid}-${idx}`} className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded border border-white/5">
                          {staff?.name || "Consultant"}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Checklist items section */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Dynamic Compliance Checklist</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Defined by Principal Owner, checkable by assigned executives.</p>
                </div>
                
                {/* Progression Bar */}
                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-xs text-[#0D2C6C]">
                    {selectedCase.checklist.filter(i => i.isCompleted).length}/{selectedCase.checklist.length} Completed
                  </span>
                </div>
              </div>

              {/* Progress Indicator line */}
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full transition-all duration-300" 
                  style={{ width: `${selectedCase.checklist.length > 0 ? (selectedCase.checklist.filter(i => i.isCompleted).length / selectedCase.checklist.length) * 100 : 0}%` }}
                ></div>
              </div>

              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                {selectedCase.checklist.map(item => (
                  <label
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2 rounded-xl border border-slate-100 cursor-pointer select-none transition-colors ${item.isCompleted ? "bg-slate-50/50 text-slate-400" : "bg-white hover:bg-slate-50 text-slate-700"}`}
                  >
                    <input
                      type="checkbox"
                      checked={item.isCompleted}
                      onChange={(e) => handleToggleChecklist(selectedCase.id, item.id, e.target.checked)}
                      className="mt-0.5 rounded border-slate-300 text-[#0D2C6C] focus:ring-[#D4AF37] h-3.5 w-3.5 cursor-pointer"
                    />
                    <div className="text-xs font-semibold leading-tight">
                      <span className={item.isCompleted ? "line-through text-slate-400" : ""}>{item.title}</span>
                      {item.isCompleted && item.completedBy && (
                        <span className="block text-[8px] text-slate-400 font-bold mt-0.5 uppercase tracking-wide">
                          Done by {item.completedBy} • {new Date(item.completedAt || "").toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Invoicing, receipts, payments & QR codes (THE HEART OF COMPLIANCE INTEGRATION) */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Case Corporate Invoicing</span>
                <span className="text-[10px] font-bold text-slate-400 italic">Financial Module</span>
              </div>

              {!selectedCase.invoice ? (
                <div className="py-4 text-center space-y-3.5">
                  <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-slate-300">
                    <Receipt className="w-6 h-6" />
                  </div>
                  <div className="space-y-1 max-w-xs mx-auto">
                    <h4 className="text-xs font-bold text-[#0D2C6C]">No Invoice raised yet for this Case</h4>
                    <p className="text-[10px] text-slate-400 font-medium">Invoices should never exist without a Case. Press below to generate one.</p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setInvoiceSubtotal(10000);
                        setInvoiceDueDate(new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split("T")[0]);
                        setIsInvoiceModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 bg-[#0D2C6C] hover:bg-blue-950 text-white font-bold text-[10px] tracking-wide uppercase px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow-md"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Raise Corporate Invoice
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Detailed Invoice Display */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest">Invoice Ref No</span>
                        <span className="font-mono font-extrabold text-xs text-[#0D2C6C]">{selectedCase.invoice?.id}</span>
                      </div>
                      <span className={`text-[9px] font-extrabold border px-2 py-0.5 rounded-full uppercase tracking-wide ${selectedCase.invoice?.status === "PAID" ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"}`}>
                        {selectedCase.invoice?.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs border-t border-b border-slate-100/80 py-2">
                      <div>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">Base Amt</span>
                        <span className="font-extrabold text-slate-700">₹{selectedCase.invoice?.subTotal?.toLocaleString("en-IN") || "0"}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">GST ({selectedCase.invoice?.gstRate || 18}%)</span>
                        <span className="font-extrabold text-slate-700">₹{selectedCase.invoice?.gstAmount?.toLocaleString("en-IN") || "0"}</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-widest">Total Bill</span>
                        <span className="font-extrabold text-[#0D2C6C]">₹{selectedCase.invoice?.totalAmount?.toLocaleString("en-IN") || "0"}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-slate-500 font-medium">
                      <span>Billed Date: {selectedCase.invoice?.date}</span>
                      <span>Due Date: {selectedCase.invoice?.dueDate}</span>
                    </div>
                  </div>

                  {/* Payments logging list */}
                  {selectedCase.invoice?.payments && selectedCase.invoice.payments.length > 0 && (
                    <div className="space-y-2">
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment Timeline</span>
                      <div className="space-y-1.5">
                        {selectedCase.invoice.payments.map(p => (
                          <div key={p.id} className="bg-emerald-50/50 p-2 rounded-lg border border-emerald-100/70 text-[10px] font-semibold text-emerald-800 flex justify-between items-center">
                            <div>
                              <div>{p.id} via [{p.mode}] - {p.date}</div>
                              {p.transactionRef && <span className="text-[8px] text-emerald-600 block">Ref: {p.transactionRef}</span>}
                            </div>
                            <span className="font-extrabold">₹{p.amount.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Payment collection action or UPI scan */}
                  {selectedCase.invoice?.status !== "PAID" && (
                    <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl">
                      
                      {/* Premium UPI QR mock */}
                      <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-200 shadow-sm shrink-0 flex flex-col justify-between">
                        <div className="bg-slate-100 w-full h-20 rounded flex items-center justify-center text-slate-300 select-none">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                            className="w-10 h-10 border-2 border-dashed border-[#D4AF37] rounded-full flex items-center justify-center text-[8px] font-mono font-bold text-[#D4AF37]"
                          >
                            UPI QR
                          </motion.div>
                        </div>
                        <div className="text-[6px] font-bold text-center text-slate-400 tracking-wider">JA@UPI</div>
                      </div>

                      <div className="space-y-2.5 text-center sm:text-left flex-grow">
                        <div>
                          <h4 className="text-xs font-bold text-[#0D2C6C]">Official Scan-to-Pay</h4>
                          <p className="text-[9px] text-slate-400 font-medium">Billed client can instantly scan the sandbox UPI dynamic code to finalize outstanding balance.</p>
                        </div>
                        
                        <button
                          onClick={() => {
                            if (selectedCase.invoice) {
                              const paid = selectedCase.invoice.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
                              setPaymentAmount(selectedCase.invoice.totalAmount - paid);
                              setIsPaymentModalOpen(true);
                            }
                          }}
                          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[9px] tracking-wide uppercase px-3.5 py-2 rounded-lg cursor-pointer transition-colors shadow"
                        >
                          <Landmark className="w-3.5 h-3.5" />
                          Record Receipt Payment
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              )}
            </div>

            {/* Document attachments folder vault */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Infinite Digital Vault ({selectedCase.attachments.length})</h3>
                  <p className="text-[10px] text-slate-400 font-medium">Categorized legal, portal, and transaction document proofs.</p>
                </div>
                <button
                  onClick={() => setIsAttachmentModalOpen(true)}
                  className="p-1.5 bg-slate-50 border border-slate-100 text-[#0D2C6C] hover:text-[#D4AF37] rounded-lg cursor-pointer transition-colors"
                  title="Upload Document Proof"
                >
                  <PlusCircle className="w-4 h-4" />
                </button>
              </div>

              {selectedCase.attachments.length === 0 ? (
                <div className="py-6 text-center text-xs font-semibold text-slate-400 italic">
                  Digital vault is empty. Upload DSC or portal attachments.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Categorized rendering */}
                  {["Identity", "Financial", "Portal", "Tax Document", "Receipt", "Acknowledgement", "Other"].map(cat => {
                    const docsInCat = selectedCase.attachments.filter(a => a.category === cat);
                    if (docsInCat.length === 0) return null;
                    return (
                      <div key={cat} className="space-y-1.5">
                        <span className="block text-[8px] font-bold text-[#D4AF37] uppercase tracking-widest pl-1">{cat} Folder</span>
                        <div className="space-y-1">
                          {docsInCat.map(doc => (
                            <div key={doc.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FolderOpen className="w-4 h-4 text-[#0D2C6C] shrink-0" />
                                <div className="space-y-0.5">
                                  <span className="font-semibold text-slate-700 line-clamp-1">{doc.fileName}</span>
                                  <span className="block text-[8px] text-slate-400">By {doc.uploadedBy} • {new Date(doc.uploadedAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                  onClick={() => alert(`Simulated Vault Document Preview for '${doc.fileName}' [Data representation is safe in sandbox cache].`)}
                                  className="p-1 text-slate-400 hover:text-[#0D2C6C] cursor-pointer"
                                  title="Preview File"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <a
                                  href={`data:application/octet-stream;base64,${doc.fileData}`}
                                  download={doc.fileName}
                                  className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                                  title="Download Original Proof"
                                >
                                  <Download className="w-4 h-4" />
                                </a>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Case Timeline Activity Logs */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Dynamic Case Timeline</span>
                <span className="text-[10px] font-bold text-slate-400 italic">Audit Ledger</span>
              </div>

              <div className="space-y-4 max-h-60 overflow-y-auto pr-1">
                {selectedCase.timeline.map((evt, idx) => (
                  <div key={evt.id} className="relative flex gap-3 text-xs">
                    {/* Vertical connecting line */}
                    {idx !== selectedCase.timeline.length - 1 && (
                      <div className="absolute left-2.5 top-5 bottom-0 w-0.5 bg-slate-100"></div>
                    )}
                    
                    <div className="w-5 h-5 rounded-full bg-[#0D2C6C]/5 text-[#0D2C6C] border border-[#0D2C6C]/15 flex items-center justify-center shrink-0 z-10">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></span>
                    </div>

                    <div className="space-y-0.5 flex-grow pb-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-800">{evt.title}</span>
                        <span className="text-[8px] font-mono text-slate-400">{new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 font-medium">{evt.details}</p>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wide">By {evt.userName}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Communications & Notes Board */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Communications Board</span>
                <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-wider">Secure logs</span>
              </div>

              {/* Note Type Switcher */}
              <div className="flex gap-1.5 bg-slate-50 p-1 rounded-xl">
                {["STAFF", "OWNER", "INTERNAL"].map(t => {
                  if (t === "OWNER" && !isOwner) return null;
                  return (
                    <button
                      key={t}
                      onClick={() => setNewNoteType(t as CaseNote["type"])}
                      className={`flex-grow text-[9px] font-bold py-1.5 rounded-lg border cursor-pointer transition-all uppercase tracking-wider ${newNoteType === t ? "bg-[#0D2C6C] text-white border-[#0D2C6C]" : "bg-white text-slate-500 border-slate-100 hover:text-slate-700"}`}
                    >
                      {t} Notes
                    </button>
                  );
                })}
              </div>

              {/* Note Display logs */}
              {selectedCase.notes.length === 0 ? (
                <div className="text-center py-4 text-xs font-semibold text-slate-400 italic">No notes logged for this Case.</div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {selectedCase.notes
                    .filter(n => isOwner || n.type !== "OWNER")
                    .map(note => (
                      <div 
                        key={note.id} 
                        className={`p-3 rounded-xl border text-xs space-y-1 ${
                          note.type === "OWNER" ? "bg-amber-50/40 border-amber-100 text-amber-900" :
                          note.type === "INTERNAL" ? "bg-purple-50/40 border-purple-100 text-purple-900" :
                          "bg-slate-50/55 border-slate-100 text-slate-700"
                        }`}
                      >
                        <div className="flex justify-between items-center text-[8px] font-bold uppercase tracking-wider">
                          <span className={note.type === "OWNER" ? "text-amber-700" : note.type === "INTERNAL" ? "text-purple-700" : "text-slate-400"}>
                            {note.type} Note
                          </span>
                          <span className="text-slate-400 font-mono">{new Date(note.timestamp).toLocaleDateString()}</span>
                        </div>
                        <p className="font-medium text-[11px] leading-normal">{note.content}</p>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest text-right">By {note.authorName}</span>
                      </div>
                    ))}
                </div>
              )}

              {/* Note Add Input */}
              <form onSubmit={(e) => handleAddNote(e, selectedCase.id)} className="flex gap-2">
                <input
                  type="text"
                  placeholder={`Write secure ${newNoteType.toLowerCase()} communication note...`}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="flex-grow bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs border border-slate-200 focus:border-[#D4AF37] px-3.5 py-2 rounded-xl outline-none text-slate-700 transition-colors placeholder:text-slate-400"
                />
                <button
                  type="submit"
                  className="bg-[#0D2C6C] hover:bg-blue-950 p-2 rounded-xl text-white hover:text-[#D4AF37] cursor-pointer transition-colors shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>

      {/* MODAL: Initiate Corporate Case */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden"
          >
            <div className="bg-[#0D2C6C] p-4 flex items-center justify-between text-white">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#D4AF37] flex items-center gap-2">
                <PlusCircle className="w-4.5 h-4.5" />
                Initiate New Corporate Case
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="p-5 space-y-4 text-xs font-semibold">
              
              {/* Client Selection */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Client CRM Account</label>
                <select
                  value={newCaseClientId}
                  onChange={(e) => setNewCaseClientId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Client Profile --</option>
                  {clients.map(cl => (
                    <option key={cl.id} value={cl.id}>{cl.id} - {cl.name}</option>
                  ))}
                </select>
              </div>

              {/* Service Selection */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Compliance Service Catalog</label>
                <select
                  value={newCaseServiceId}
                  onChange={(e) => setNewCaseServiceId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                  required
                >
                  <option value="">-- Choose Professional Service --</option>
                  {services.map(sr => (
                    <option key={sr.id} value={sr.id}>{sr.id} - {sr.name} ({sr.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Priority Level</label>
                  <select
                    value={newCasePriority}
                    onChange={(e) => setNewCasePriority(e.target.value as CasePriority)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>

                {/* Expected completion Date */}
                <div className="space-y-1.5">
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Target Completion Date</label>
                  <input
                    type="date"
                    value={newCaseExpectedDate}
                    onChange={(e) => setNewCaseExpectedDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                    required
                  />
                </div>
              </div>

              {/* Multiple Staff Assignment Selector */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Assign Senior Staff Executives (Multiple Select)</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 border border-slate-200 rounded-xl max-h-32 overflow-y-auto">
                  {staffUsers.map(st => {
                    const isSelected = newCaseStaffIds.includes(st.id);
                    return (
                      <label key={st.id} className="flex items-center gap-2 p-1.5 hover:bg-slate-100 rounded-lg cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            if (isSelected) {
                              setNewCaseStaffIds(newCaseStaffIds.filter(id => id !== st.id));
                            } else {
                              setNewCaseStaffIds([...newCaseStaffIds, st.id]);
                            }
                          }}
                          className="rounded text-[#0D2C6C] h-3.5 w-3.5 cursor-pointer"
                        />
                        <span className="font-bold text-slate-700">{st.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Custom Checklist Option */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Override Custom Checklist Items (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter customized checklist brief..."
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    className="flex-grow bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none text-slate-700 font-medium"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItem}
                    className="bg-[#0D2C6C] text-white hover:text-[#D4AF37] font-bold text-xs px-3.5 py-2.5 rounded-xl cursor-pointer shrink-0"
                  >
                    Add
                  </button>
                </div>
                {customChecklistItems.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-1.5 p-2 bg-slate-50/50 border border-slate-100 rounded-xl">
                    {customChecklistItems.map((title, i) => (
                      <span key={i} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2.5 py-1 rounded text-slate-700">
                        {title}
                        <button type="button" onClick={() => removeChecklistItem(i)} className="text-rose-500 font-extrabold hover:text-rose-700 cursor-pointer">×</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#D4AF37] hover:bg-[#c29e2f] text-[#0D2C6C] font-extrabold px-5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  Confirm & Launch Case
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Generate Corporate Invoice */}
      {isInvoiceModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden"
          >
            <div className="bg-[#0D2C6C] p-4 flex items-center justify-between text-white">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <Receipt className="w-4.5 h-4.5" />
                Generate Corporate Invoice
              </h3>
              <button onClick={() => setIsInvoiceModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleGenerateInvoice(e, selectedCase.id)} className="p-5 space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/70 text-slate-500 font-medium">
                Generating professional tax/audit invoice for client <strong className="text-slate-700">{selectedCase.clientName}</strong>.
              </div>

              {/* Taxable Subtotal value */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Professional Base Fee (INR)</label>
                <input
                  type="number"
                  value={invoiceSubtotal}
                  onChange={(e) => setInvoiceSubtotal(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700"
                  required
                />
              </div>

              {/* GST rate */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Applicable CGST/SGST/IGST Rate</label>
                <select
                  value={invoiceGstRate}
                  onChange={(e) => setInvoiceGstRate(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                >
                  <option value={18}>18% GST (Standard Audit & Consulting)</option>
                  <option value={5}>5% GST (Special Category)</option>
                  <option value={12}>12% GST (Alternative Services)</option>
                  <option value={0}>0% Tax Exempt / Nil Rated</option>
                </select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment Due Date</label>
                <input
                  type="date"
                  value={invoiceDueDate}
                  onChange={(e) => setInvoiceDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700"
                  required
                />
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingInvoice}
                  className={`bg-[#0D2C6C] hover:bg-blue-950 text-white hover:text-[#D4AF37] font-extrabold px-5 py-2.5 rounded-xl shadow transition-all cursor-pointer flex items-center gap-2 ${
                    isSubmittingInvoice ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmittingInvoice ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authorizing & Generating...</span>
                    </>
                  ) : (
                    "Authorize & Print Invoice"
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Record Invoice Payment Receipt */}
      {isPaymentModalOpen && selectedCase && selectedCase.invoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden"
          >
            <div className="bg-[#0D2C6C] p-4 flex items-center justify-between text-white">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <Landmark className="w-4.5 h-4.5" />
                Record Payment Receipt
              </h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleAddPayment(e, selectedCase.id)} className="p-5 space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100/70 text-slate-500 font-medium">
                Logging payment receipt for Invoice Ref: <strong className="text-slate-700">{selectedCase.invoice?.id}</strong>. Outstanding amount representation: ₹{((selectedCase.invoice?.totalAmount || 0) - (selectedCase.invoice?.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)).toLocaleString("en-IN")}.
              </div>

              {/* Amount paid */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Amount Received (INR)</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700"
                  required
                />
              </div>

              {/* Mode */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Payment Mode Channel</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                >
                  <option value="UPI Transfer">BHIM UPI Instant Transfer</option>
                  <option value="NEFT/RTGS Bank Transfer">NEFT/RTGS/IMPS Bank Transfer</option>
                  <option value="Cheque Realization">Cheque Deposit</option>
                  <option value="Cash In Hand">Cash in Hand</option>
                </select>
              </div>

              {/* Transaction Ref */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Upi ID / Transaction Reference (Optional)</label>
                <input
                  type="text"
                  placeholder="E.g., TXN21212452323"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Office Remarks / Reconciliation Notes</label>
                <input
                  type="text"
                  placeholder="E.g., fully paid on portal confirmation"
                  value={paymentRemarks}
                  onChange={(e) => setPaymentRemarks(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-medium text-slate-700"
                />
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPayment}
                  className={`bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold px-5 py-2.5 rounded-xl shadow transition-all cursor-pointer flex items-center gap-2 ${
                    isSubmittingPayment ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                >
                  {isSubmittingPayment ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Recording Receipt...</span>
                    </>
                  ) : (
                    "Record Payment"
                  )}
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

      {/* MODAL: Upload Vault Document */}
      {isAttachmentModalOpen && selectedCase && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full overflow-hidden"
          >
            <div className="bg-[#0D2C6C] p-4 flex items-center justify-between text-white">
              <h3 className="font-display font-extrabold text-sm uppercase tracking-wider text-[#D4AF37] flex items-center gap-1.5">
                <FolderOpen className="w-4.5 h-4.5" />
                Upload Document Proof
              </h3>
              <button onClick={() => setIsAttachmentModalOpen(false)} className="text-white/50 hover:text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleAddAttachment(e, selectedCase.id)} className="p-5 space-y-4 text-xs font-semibold">
              
              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Document File Name</label>
                <input
                  type="text"
                  placeholder="E.g., GSTR-3B_Receipt_May.pdf"
                  value={attachFileName}
                  onChange={(e) => setAttachFileName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1">Vault Category Folder</label>
                <select
                  value={attachCategory}
                  onChange={(e) => setAttachCategory(e.target.value as CaseAttachment["category"])}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-[#D4AF37] rounded-xl p-2.5 outline-none font-bold text-slate-700 cursor-pointer"
                >
                  <option value="Identity">Identity Briefs (PAN/Aadhaar)</option>
                  <option value="Financial">Financial Statements (T&C, computations)</option>
                  <option value="Portal">Portal Credentials or Registrations</option>
                  <option value="Tax Document">Tax Returns or Filings</option>
                  <option value="Receipt">Invoice or Payment Receipts</option>
                  <option value="Acknowledgement">Acknowledgement Receipts</option>
                  <option value="Other">Other Miscellaneous Documents</option>
                </select>
              </div>

              {/* Drag and drop sandbox simulation */}
              <div className="border-2 border-dashed border-slate-200 hover:border-[#D4AF37]/50 rounded-xl p-6 text-center space-y-1.5 bg-slate-50 transition-colors select-none">
                <FileText className="w-7 h-7 text-[#0D2C6C]/40 mx-auto" />
                <div className="font-bold text-slate-600">Simulate PDF Drop / Selection</div>
                <div className="text-[9px] text-slate-400 font-medium">Any selected files will safely encode into base64 sandbox storage payloads.</div>
              </div>

              {/* Action triggers */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAttachmentModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-500 font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#0D2C6C] hover:bg-blue-950 text-white hover:text-[#D4AF37] font-extrabold px-5 py-2.5 rounded-xl shadow transition-all cursor-pointer"
                >
                  Upload document
                </button>
              </div>

            </form>
          </motion.div>
        </div>
      )}

    </WorkspaceLayout>
  );
}
