/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Copy, Edit, Trash2, Archive, Eye, Search, Filter, CheckCircle, 
  Calendar, FileText, RefreshCw, Play, Check, X, Shield, Lock, 
  AlertCircle, User as UserIcon, Clock, ArrowRight, ChevronRight, 
  Paperclip, StickyNote, CornerDownRight, ListTodo, Settings as SettingsIcon, 
  Activity, FileSpreadsheet, Sparkles, PlusCircle, CheckCircle2, ChevronDown, HelpCircle,
  TrendingUp, Star, Users, Trash, EyeOff, ClipboardList
} from "lucide-react";
import { 
  User, UserRole, Service, Client, ServiceWorkflowTemplate, 
  ActiveWorkflow, WorkflowDocument, WorkflowTask, WorkflowTimelineEvent, WorkflowNote 
} from "../types";
import { 
  getServices, getClients, getUsers, getWorkflowTemplates, 
  saveWorkflowTemplates, getNextWorkflowTemplateId, getWorkflows, 
  saveWorkflows, getNextWorkflowId, getSettings 
} from "../lib/db";
import { hasPermission } from "../lib/permissions";

interface WorkflowEngineProps {
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

const DEFAULT_STAGES = [
  "Client Selected",
  "Service Selected",
  "Required Documents",
  "Verification",
  "Work Started",
  "Work In Progress",
  "Government Portal Filing",
  "Acknowledgement Received",
  "Completed",
  "Invoice Ready",
  "Payment Pending",
  "Closed"
];

const STANDARD_DOCUMENTS = [
  "PAN",
  "Aadhaar",
  "GST Certificate",
  "Cancelled Cheque",
  "Photo",
  "DSC",
  "MOA",
  "AOA",
  "Trust Deed",
  "Partnership Deed",
  "Bank Statement",
  "Form 16 / 26AS",
  "Any Other"
];

const WORKFLOW_STATUSES = [
  "Pending",
  "Document Pending",
  "Verification Pending",
  "Ready to File",
  "Filed",
  "Acknowledgement Received",
  "Completed",
  "Cancelled",
  "Rejected",
  "On Hold"
];

export default function WorkflowEngine({ currentUser, onAddAuditLog }: WorkflowEngineProps) {
  const isOwner = currentUser.role === UserRole.OWNER;
  const canModifyConfig = isOwner; // Only owner can configure templates
  
  // Data State
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [templates, setTemplates] = useState<ServiceWorkflowTemplate[]>([]);
  const [workflows, setWorkflows] = useState<ActiveWorkflow[]>([]);
  
  // UI Tabs
  // "active" -> Workspace for executing workflows
  // "templates" -> Configuring workflows per service
  const [activeTab, setActiveTab] = useState<"active" | "templates">("active");
  
  // Search & Filter state for Active Workflows
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [priorityFilter, setPriorityFilter] = useState("All");
  const [staffFilter, setStaffFilter] = useState("All");
  const [clientFilter, setClientFilter] = useState("All");
  
  // Sheet Sync simulation state
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [sheetsSyncTime, setSheetsSyncTime] = useState<string | null>(null);
  
  // Active Workflow Creation Form State
  const [showCreateWorkflowModal, setShowCreateWorkflowModal] = useState(false);
  const [newWfClientId, setNewWfClientId] = useState("");
  const [newWfServiceId, setNewWfServiceId] = useState("");
  const [newWfStaffId, setNewWfStaffId] = useState("");
  const [newWfDueDate, setNewWfDueDate] = useState("");
  const [newWfPriority, setNewWfPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");
  
  // Active Workflow Details Slide-over
  const [selectedWorkflow, setSelectedWorkflow] = useState<ActiveWorkflow | null>(null);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState<"INTERNAL" | "OWNER" | "STAFF" | "CLIENT">("INTERNAL");
  
  // Custom Task addition in workflow detail
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskStaffId, setNewTaskStaffId] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"Low" | "Medium" | "High" | "Critical">("Medium");

  // Template Form Modal State
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templateFormId, setTemplateFormId] = useState<string | null>(null);
  const [templateServiceId, setTemplateServiceId] = useState("");
  const [templateStages, setTemplateStages] = useState<string[]>([]);
  const [templateDocs, setTemplateDocs] = useState<string[]>([]);
  const [autoDueDateDays, setAutoDueDateDays] = useState(15);
  const [autoStatusChange, setAutoStatusChange] = useState(true);
  const [autoInvoiceEligibility, setAutoInvoiceEligibility] = useState(true);
  const [newStageInput, setNewStageInput] = useState("");

  // Load datasets on mount
  useEffect(() => {
    setServices(getServices());
    setClients(getClients());
    
    // Filter out inactive/suspended users, show all staff & owner
    const allUsers = getUsers();
    setStaffUsers(allUsers.filter(u => u.status === "ACTIVE"));
    
    // Load Templates
    let loadedTemplates = getWorkflowTemplates();
    if (loadedTemplates.length === 0) {
      // Auto-generate some default templates if none exist
      const srvs = getServices();
      const initialTemplates: ServiceWorkflowTemplate[] = srvs.slice(0, 3).map((srv, index) => ({
        id: `WFT${(index + 1).toString().padStart(4, "0")}`,
        serviceId: srv.id,
        serviceName: srv.name,
        serviceCode: srv.code,
        stages: [...DEFAULT_STAGES],
        requiredDocuments: srv.category === "GST" 
          ? ["PAN", "Aadhaar", "GST Certificate", "Bank Statement"]
          : ["PAN", "Aadhaar", "Form 16 / 26AS", "Bank Statement"],
        autoDueDateDays: 15,
        autoStatusChange: true,
        autoInvoiceEligibility: true,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));
      if (initialTemplates.length > 0) {
        saveWorkflowTemplates(initialTemplates);
        loadedTemplates = initialTemplates;
      }
    }
    setTemplates(loadedTemplates);
    
    // Load Workflows
    let loadedWorkflows = getWorkflows();
    if (loadedWorkflows.length === 0 && loadedTemplates.length > 0) {
      // Auto-generate a default seed workflow for demo purposes
      const clts = getClients();
      if (clts.length > 0) {
        const primaryTemplate = loadedTemplates[0];
        const seedWf: ActiveWorkflow = {
          id: "WF000001",
          clientId: clts[0].id,
          clientName: clts[0].name,
          serviceId: primaryTemplate.serviceId,
          serviceName: primaryTemplate.serviceName,
          serviceCode: primaryTemplate.serviceCode,
          templateId: primaryTemplate.id,
          currentStageIndex: 2, // Required Documents
          status: "Document Pending",
          requiredDocuments: primaryTemplate.requiredDocuments.map(doc => ({
            name: doc,
            status: doc === "PAN" ? "Verified" : "Pending",
            uploadedBy: doc === "PAN" ? "jainnagarwal90@gmail.com" : undefined,
            uploadedAt: doc === "PAN" ? new Date().toISOString() : undefined
          })),
          tasks: [
            {
              id: "task_1",
              title: "Collect and verify client PAN card details",
              assignedStaffId: "usr_staff_001",
              assignedStaffName: "Amit Sharma",
              dueDate: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
              priority: "High",
              status: "Completed",
              createdAt: new Date().toISOString()
            },
            {
              id: "task_2",
              title: "Collect Aadhaar and Bank Statement",
              assignedStaffId: "usr_staff_001",
              assignedStaffName: "Amit Sharma",
              dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
              priority: "Medium",
              status: "Pending",
              createdAt: new Date().toISOString()
            }
          ],
          timeline: [
            {
              id: "evt_1",
              timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
              title: "Workflow Initialized",
              details: `Dynamic compliance engine started for service ${primaryTemplate.serviceName}`,
              userEmail: "jainnagarwal90@gmail.com",
              userName: "CA. Jain Agarwal"
            },
            {
              id: "evt_2",
              timestamp: new Date(Date.now() - 3600000).toISOString(),
              title: "PAN Document Uploaded",
              details: "Uploaded and instantly verified against PAN registry.",
              userEmail: "jainnagarwal90@gmail.com",
              userName: "CA. Jain Agarwal"
            }
          ],
          notes: [
            {
              id: "note_1",
              type: "OWNER",
              content: "Double-check the trade name matches the GST registry exactly.",
              authorName: "CA. Jain Agarwal",
              authorEmail: "jainnagarwal90@gmail.com",
              timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString()
            }
          ],
          assignedStaffId: "usr_staff_001",
          assignedStaffName: "Amit Sharma",
          dueDate: new Date(Date.now() + 86400000 * 15).toISOString().split("T")[0],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        saveWorkflows([seedWf]);
        loadedWorkflows = [seedWf];
      }
    }
    setWorkflows(loadedWorkflows);
    
    // Read sync status
    const savedSync = localStorage.getItem("jn_officeos_workflows_last_sync");
    if (savedSync) setSheetsSyncTime(savedSync);
  }, []);

  // Sync Workflows with Google Sheets simulation
  const handleSyncWithSheets = () => {
    setIsSyncingSheets(true);
    setTimeout(() => {
      const nowStr = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
      localStorage.setItem("jn_officeos_workflows_last_sync", nowStr);
      setSheetsSyncTime(nowStr);
      setIsSyncingSheets(false);
      
      // Post to audit log
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "WORKFLOW_GOOGLE_SHEETS_SYNC",
        "DATABASE",
        `Synchronized active workflows, task registers, notes, and chronological timelines to Google Sheets database.`
      );
    }, 1500);
  };

  // Staff constraint: staff only see assigned workflows
  const visibleWorkflows = workflows.filter(wf => {
    if (!isOwner && wf.assignedStaffId !== currentUser.id && !wf.tasks.some(t => t.assignedStaffId === currentUser.id)) {
      // Check if user is assigned overall or has an assigned task
      return false;
    }
    
    // Search filter
    const matchesSearch = 
      wf.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.clientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.serviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.serviceCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.assignedStaffName.toLowerCase().includes(searchQuery.toLowerCase());
      
    // Status filter
    const matchesStatus = statusFilter === "All" || wf.status === statusFilter;
    
    // Priority filter (derived or explicit on task / deadline)
    const matchesPriority = priorityFilter === "All" || wf.tasks.some(t => t.priority === priorityFilter);
    
    // Staff filter
    const matchesStaff = staffFilter === "All" || wf.assignedStaffId === staffFilter;
    
    // Client filter
    const matchesClient = clientFilter === "All" || wf.clientId === clientFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesStaff && matchesClient;
  });

  // Create active workflow
  const handleCreateActiveWorkflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWfClientId || !newWfServiceId || !newWfStaffId) {
      alert("Please select Client, Service, and Staff.");
      return;
    }
    
    // Find Client, Service template
    const cl = clients.find(c => c.id === newWfClientId);
    const tm = templates.find(t => t.serviceId === newWfServiceId);
    const staff = staffUsers.find(u => u.id === newWfStaffId);
    const srv = services.find(s => s.id === newWfServiceId);
    
    if (!cl || !srv) {
      alert("Invalid Client or Service configuration.");
      return;
    }
    
    // If no template is configured for this service yet, create a default on-the-fly
    let activeTemplate = tm;
    if (!activeTemplate) {
      const newTemplateId = getNextWorkflowTemplateId();
      activeTemplate = {
        id: newTemplateId,
        serviceId: srv.id,
        serviceName: srv.name,
        serviceCode: srv.code,
        stages: [...DEFAULT_STAGES],
        requiredDocuments: ["PAN", "Aadhaar"],
        autoDueDateDays: 15,
        autoStatusChange: true,
        autoInvoiceEligibility: true,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      const updatedTemplates = [...templates, activeTemplate];
      saveWorkflowTemplates(updatedTemplates);
      setTemplates(updatedTemplates);
    }
    
    const nextWfId = getNextWorkflowId();
    const finalDueDate = newWfDueDate || new Date(Date.now() + 86400000 * activeTemplate.autoDueDateDays).toISOString().split("T")[0];
    
    const newWorkflow: ActiveWorkflow = {
      id: nextWfId,
      clientId: cl.id,
      clientName: cl.name,
      serviceId: srv.id,
      serviceName: srv.name,
      serviceCode: srv.code,
      templateId: activeTemplate.id,
      currentStageIndex: 0,
      status: "Pending",
      requiredDocuments: activeTemplate.requiredDocuments.map(doc => ({
        name: doc,
        status: "Pending"
      })),
      tasks: [
        {
          id: `task_gen_${Date.now()}_1`,
          title: `Initialize compliance workflow & gather documents for ${srv.name}`,
          assignedStaffId: staff?.id || currentUser.id,
          assignedStaffName: staff?.name || currentUser.name,
          dueDate: finalDueDate,
          priority: newWfPriority,
          status: "Pending",
          createdAt: new Date().toISOString()
        }
      ],
      timeline: [
        {
          id: `evt_gen_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Workflow Spawned",
          details: `Active regulatory engine launched for client ${cl.name} based on compliance model ${srv.name}.`,
          userEmail: currentUser.email,
          userName: currentUser.name
        }
      ],
      notes: [],
      assignedStaffId: staff?.id || currentUser.id,
      assignedStaffName: staff?.name || currentUser.name,
      dueDate: finalDueDate,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedWorkflows = [newWorkflow, ...workflows];
    saveWorkflows(updatedWorkflows);
    setWorkflows(updatedWorkflows);
    
    // Log audit
    onAddAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "WORKFLOW_LAUNCHED",
      "DATABASE",
      `Launched workflow ${nextWfId} (${srv.code}) assigned to ${staff?.name || currentUser.name} for Client ${cl.name}.`
    );
    
    // Reset form
    setNewWfClientId("");
    setNewWfServiceId("");
    setNewWfStaffId("");
    setNewWfDueDate("");
    setNewWfPriority("Medium");
    setShowCreateWorkflowModal(false);
  };

  // Manage Workflow Progress (Owner & Staff can update stage/status)
  const handleUpdateWorkflowStage = (wfId: string, stepOffset: number) => {
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const tm = templates.find(t => t.id === wf.templateId);
      const totalStages = tm ? tm.stages.length : DEFAULT_STAGES.length;
      let nextIndex = wf.currentStageIndex + stepOffset;
      if (nextIndex < 0) nextIndex = 0;
      if (nextIndex >= totalStages) nextIndex = totalStages - 1;
      
      const stageName = tm ? tm.stages[nextIndex] : DEFAULT_STAGES[nextIndex];
      const prevStageName = tm ? tm.stages[wf.currentStageIndex] : DEFAULT_STAGES[wf.currentStageIndex];
      
      if (nextIndex === wf.currentStageIndex) return wf;
      
      // Auto status mapping based on stage progression
      let nextStatus = wf.status;
      if (stageName.toLowerCase().includes("completed")) {
        nextStatus = "Completed";
      } else if (stageName.toLowerCase().includes("document")) {
        nextStatus = "Document Pending";
      } else if (stageName.toLowerCase().includes("verify") || stageName.toLowerCase().includes("verification")) {
        nextStatus = "Verification Pending";
      } else if (stageName.toLowerCase().includes("filing") || stageName.toLowerCase().includes("file")) {
        nextStatus = "Ready to File";
      } else if (stageName.toLowerCase().includes("filed")) {
        nextStatus = "Filed";
      } else if (stageName.toLowerCase().includes("acknowledg")) {
        nextStatus = "Acknowledgement Received";
      } else if (stageName.toLowerCase().includes("closed")) {
        nextStatus = "Completed";
      }
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_progress_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Stage Progressed",
        details: `Advanced compliance track from '${prevStageName}' to '${stageName}'.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        currentStageIndex: nextIndex,
        status: nextStatus,
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  const handleUpdateWorkflowStatus = (wfId: string, status: ActiveWorkflow["status"]) => {
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_status_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Status Changed",
        details: `Compliance state transitioned to ${status}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        status,
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  // Document actions (Upload & Verification)
  const handleUploadDocument = (wfId: string, docName: string, simulatedFile: { name: string; type: string }) => {
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const updatedDocs = wf.requiredDocuments.map(doc => {
        if (doc.name !== docName) return doc;
        return {
          ...doc,
          status: "Uploaded" as const,
          fileName: simulatedFile.name,
          fileType: simulatedFile.type,
          fileData: "base64_representation_of_document",
          uploadedAt: new Date().toISOString(),
          uploadedBy: currentUser.email
        };
      });
      
      // Auto status change if all documents uploaded
      let newStatus = wf.status;
      const tm = templates.find(t => t.id === wf.templateId);
      const autoChangeEnabled = tm ? tm.autoStatusChange : true;
      
      if (autoChangeEnabled && updatedDocs.every(d => d.status === "Uploaded" || d.status === "Verified")) {
        newStatus = "Verification Pending";
      }
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_doc_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Document Uploaded",
        details: `Required file '${docName}' (${simulatedFile.name}) was secured into the client vault.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        status: newStatus,
        requiredDocuments: updatedDocs,
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  const handleVerifyDocument = (wfId: string, docName: string, verify: boolean, rejectReason?: string) => {
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const updatedDocs = wf.requiredDocuments.map(doc => {
        if (doc.name !== docName) return doc;
        return {
          ...doc,
          status: verify ? ("Verified" as const) : ("Rejected" as const),
          verifiedAt: verify ? new Date().toISOString() : undefined,
          verifiedBy: verify ? currentUser.email : undefined,
          rejectionReason: !verify ? rejectReason : undefined
        };
      });
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_doc_ver_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: verify ? "Document Verified" : "Document Rejected",
        details: verify 
          ? `Owner verified and signed off on compliance file: '${docName}'.`
          : `Document '${docName}' rejected. Reason: ${rejectReason}`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        requiredDocuments: updatedDocs,
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  // Note management
  const handleAddWorkflowNote = (wfId: string) => {
    if (!newNoteContent.trim()) return;
    
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const newNote: WorkflowNote = {
        id: `note_${Date.now()}`,
        type: newNoteType,
        content: newNoteContent,
        authorName: currentUser.name,
        authorEmail: currentUser.email,
        timestamp: new Date().toISOString()
      };
      
      const updatedWf = {
        ...wf,
        notes: [...wf.notes, newNote],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
    setNewNoteContent("");
  };

  // Task actions
  const handleAddCustomTask = (wfId: string) => {
    if (!newTaskTitle.trim() || !newTaskStaffId) {
      alert("Please provide a task title and select an assigned staff member.");
      return;
    }
    
    const staff = staffUsers.find(u => u.id === newTaskStaffId);
    if (!staff) return;
    
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      const newTask: WorkflowTask = {
        id: `task_custom_${Date.now()}`,
        title: newTaskTitle,
        assignedStaffId: staff.id,
        assignedStaffName: staff.name,
        dueDate: newTaskDueDate || new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
        priority: newTaskPriority,
        status: "Pending",
        createdAt: new Date().toISOString()
      };
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_task_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Task Assigned",
        details: `Assigned task '${newTaskTitle}' to executive ${staff.name}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        tasks: [...wf.tasks, newTask],
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
    setNewTaskTitle("");
    setNewTaskStaffId("");
    setNewTaskDueDate("");
    setNewTaskPriority("Medium");
  };

  const handleToggleTaskStatus = (wfId: string, taskId: string) => {
    const updated = workflows.map(wf => {
      if (wf.id !== wfId) return wf;
      
      let taskTitle = "";
      let isCompleted = false;
      
      const updatedTasks = wf.tasks.map(t => {
        if (t.id !== taskId) return t;
        const nextStatus = t.status === "Pending" ? "Completed" as const : "Pending" as const;
        taskTitle = t.title;
        isCompleted = nextStatus === "Completed";
        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === "Completed" ? new Date().toISOString() : undefined
        };
      });
      
      const timelineEvent: WorkflowTimelineEvent = {
        id: `evt_task_status_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: isCompleted ? "Task Completed" : "Task Re-opened",
        details: `Task '${taskTitle}' was marked as ${isCompleted ? "completed" : "pending"} by ${currentUser.name}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      
      const updatedWf = {
        ...wf,
        tasks: updatedTasks,
        timeline: [...wf.timeline, timelineEvent],
        updatedAt: new Date().toISOString()
      };
      
      if (selectedWorkflow && selectedWorkflow.id === wfId) {
        setSelectedWorkflow(updatedWf);
      }
      
      return updatedWf;
    });
    
    setWorkflows(updated);
    saveWorkflows(updated);
  };

  // Clone template
  const handleCloneTemplate = (temp: ServiceWorkflowTemplate) => {
    const nextId = getNextWorkflowTemplateId();
    const cloned: ServiceWorkflowTemplate = {
      ...temp,
      id: nextId,
      serviceName: `${temp.serviceName} (Cloned)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updated = [...templates, cloned];
    saveWorkflowTemplates(updated);
    setTemplates(updated);
    
    onAddAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "WORKFLOW_TEMPLATE_CLONED",
      "DATABASE",
      `Cloned workflow template for service code ${temp.serviceCode} to new model ID ${nextId}.`
    );
  };

  // Toggle template active status
  const handleToggleTemplateActive = (tempId: string) => {
    const updated = templates.map(t => {
      if (t.id !== tempId) return t;
      const nextActive = !t.isActive;
      
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        nextActive ? "WORKFLOW_TEMPLATE_ENABLED" : "WORKFLOW_TEMPLATE_DISABLED",
        "DATABASE",
        `${nextActive ? "Enabled" : "Disabled"} workflow model mapping for ${t.serviceName}.`
      );
      
      return {
        ...t,
        isActive: nextActive,
        updatedAt: new Date().toISOString()
      };
    });
    
    saveWorkflowTemplates(updated);
    setTemplates(updated);
  };

  // Archive template
  const handleArchiveTemplate = (tempId: string) => {
    const updated = templates.map(t => {
      if (t.id !== tempId) return t;
      
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "WORKFLOW_TEMPLATE_ARCHIVED",
        "DATABASE",
        `Archived compliance blueprint for ${t.serviceName}.`
      );
      
      return {
        ...t,
        isArchived: true,
        updatedAt: new Date().toISOString()
      };
    });
    
    saveWorkflowTemplates(updated);
    setTemplates(updated);
  };

  // Handle Template Create or Edit form submission
  const handleSaveTemplateForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateServiceId) {
      alert("Please select a Service.");
      return;
    }
    
    const srv = services.find(s => s.id === templateServiceId);
    if (!srv) return;
    
    if (templateFormId) {
      // Edit mode
      const updated = templates.map(t => {
        if (t.id !== templateFormId) return t;
        return {
          ...t,
          stages: templateStages.length > 0 ? templateStages : [...DEFAULT_STAGES],
          requiredDocuments: templateDocs,
          autoDueDateDays,
          autoStatusChange,
          autoInvoiceEligibility,
          updatedAt: new Date().toISOString()
        };
      });
      saveWorkflowTemplates(updated);
      setTemplates(updated);
      
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "WORKFLOW_TEMPLATE_UPDATED",
        "DATABASE",
        `Updated active workflow stages and requirements configuration for service ${srv.name}.`
      );
    } else {
      // Create mode
      const newId = getNextWorkflowTemplateId();
      const newTemplate: ServiceWorkflowTemplate = {
        id: newId,
        serviceId: srv.id,
        serviceName: srv.name,
        serviceCode: srv.code,
        stages: templateStages.length > 0 ? templateStages : [...DEFAULT_STAGES],
        requiredDocuments: templateDocs,
        autoDueDateDays,
        autoStatusChange,
        autoInvoiceEligibility,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const updated = [...templates, newTemplate];
      saveWorkflowTemplates(updated);
      setTemplates(updated);
      
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "WORKFLOW_TEMPLATE_CREATED",
        "DATABASE",
        `Configured new compliance blueprint mapping for ${srv.name} with ${newTemplate.stages.length} custom stages.`
      );
    }
    
    // Close & Clean
    setShowTemplateModal(false);
    setTemplateFormId(null);
    setTemplateServiceId("");
    setTemplateStages([]);
    setTemplateDocs([]);
    setAutoDueDateDays(15);
    setAutoStatusChange(true);
    setAutoInvoiceEligibility(true);
  };

  // Manage Stages list in Template Form
  const handleAddFormStage = () => {
    if (!newStageInput.trim()) return;
    if (templateStages.includes(newStageInput.trim())) {
      alert("Stage already exists.");
      return;
    }
    setTemplateStages([...templateStages, newStageInput.trim()]);
    setNewStageInput("");
  };

  const handleRemoveFormStage = (index: number) => {
    const updated = [...templateStages];
    updated.splice(index, 1);
    setTemplateStages(updated);
  };

  const handleReorderFormStage = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === templateStages.length - 1) return;
    
    const updated = [...templateStages];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setTemplateStages(updated);
  };

  // Manage required documents checkboxes in template form
  const handleToggleFormDoc = (docName: string) => {
    if (templateDocs.includes(docName)) {
      setTemplateDocs(templateDocs.filter(d => d !== docName));
    } else {
      setTemplateDocs([...templateDocs, docName]);
    }
  };

  // Open Template Edit Form
  const openEditTemplateModal = (temp: ServiceWorkflowTemplate) => {
    setTemplateFormId(temp.id);
    setTemplateServiceId(temp.serviceId);
    setTemplateStages(temp.stages);
    setTemplateDocs(temp.requiredDocuments);
    setAutoDueDateDays(temp.autoDueDateDays);
    setAutoStatusChange(wfFieldOr(temp.autoStatusChange, true));
    setAutoInvoiceEligibility(wfFieldOr(temp.autoInvoiceEligibility, true));
    setShowTemplateModal(true);
  };

  // Safe fallback utility
  function wfFieldOr<T>(val: T | undefined, fallback: T): T {
    return val !== undefined ? val : fallback;
  }

  return (
    <div className="w-full space-y-6" id="compliance_workflow_engine">
      
      {/* Upper Brand Badge and Title Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-gradient-to-br from-[#0B214D] to-[#041129] p-6 rounded-3xl border border-[#D4AF37]/20 shadow-xl gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shadow-inner">
            <ClipboardList className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-xl text-white tracking-tight">Compliance Workflows</h2>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] uppercase font-bold tracking-wider">
                V2 Active Engine
              </span>
            </div>
            <p className="text-slate-300 text-xs mt-1 font-sans leading-relaxed max-w-xl">
              Configurable compliance workflow manager. Automatically binds document engines, triggers priority tasks, tracks real-time progress history, and syncs directly with Google Sheets.
            </p>
          </div>
        </div>
        
        {/* Sync Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleSyncWithSheets}
            disabled={isSyncingSheets}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-800/50 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer border border-emerald-500/30"
          >
            {isSyncingSheets ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Syncing Sheets...</span>
              </>
            ) : (
              <>
                <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
                <span>Sync Google Sheets</span>
              </>
            )}
          </button>
          
          {isOwner && (
            <button
              onClick={() => {
                if (activeTab === "active") {
                  setShowCreateWorkflowModal(true);
                } else {
                  // Reset template state
                  setTemplateFormId(null);
                  setTemplateServiceId("");
                  setTemplateStages([...DEFAULT_STAGES]);
                  setTemplateDocs(["PAN", "Aadhaar"]);
                  setAutoDueDateDays(15);
                  setAutoStatusChange(true);
                  setAutoInvoiceEligibility(true);
                  setShowTemplateModal(true);
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#D4AF37] hover:bg-[#B5912A] text-[#0D2C6C] rounded-xl text-xs font-black transition-all shadow-lg hover:shadow-xl hover:scale-[1.01] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-[#0D2C6C] stroke-[3px]" />
              <span>{activeTab === "active" ? "Launch Workflow" : "Configure Service Template"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Sheets Sync Info Banner */}
      {sheetsSyncTime && (
        <div className="flex items-center justify-between px-5 py-2.5 bg-slate-900/5 border border-slate-200 rounded-xl text-[11px] text-slate-500 font-mono">
          <span className="flex items-center gap-1.5 font-sans font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Sync Target Sheets: 
            <span className="text-slate-700 underline cursor-pointer">Workflow Registry</span>, 
            <span className="text-slate-700 underline cursor-pointer">Task Registers</span>, 
            <span className="text-slate-700 underline cursor-pointer">Activity Logs</span>
          </span>
          <span>Last Sync: {sheetsSyncTime}</span>
        </div>
      )}

      {/* Tab Selectors */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab("active")}
            className={`pb-3 text-xs font-bold transition-all relative px-2 cursor-pointer ${
              activeTab === "active" 
                ? "text-[#0D2C6C] border-b-2 border-[#D4AF37]" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4" />
              Active Workspace ({visibleWorkflows.length})
            </span>
          </button>
          <button
            onClick={() => setActiveTab("templates")}
            className={`pb-3 text-xs font-bold transition-all relative px-2 cursor-pointer ${
              activeTab === "templates" 
                ? "text-[#0D2C6C] border-b-2 border-[#D4AF37]" 
                : "text-slate-400 hover:text-slate-600"
            }`}
          >
            <span className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              Dynamic Blueprints ({templates.filter(t => !t.isArchived).length})
            </span>
          </button>
        </div>
        
        {/* Total stats */}
        <div className="text-xs text-slate-400 hidden sm:block font-sans">
          Logged as: <span className="font-bold text-slate-700">{currentUser.name}</span> ({currentUser.role === "OWNER" ? "SuperAdmin" : currentUser.role})
        </div>
      </div>

      {/* ACTIVE WORKSPACE TAB */}
      {activeTab === "active" && (
        <div className="space-y-6">
          
          {/* SEARCH & FILTERS PANEL */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm gap-3">
            
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search workflows..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none placeholder-slate-400 bg-slate-50/50"
              />
            </div>
            
            {/* Status Filter */}
            <div className="relative">
              <Filter className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none bg-slate-50/50 cursor-pointer appearance-none"
              >
                <option value="All">All Statuses</option>
                {WORKFLOW_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Priority filter */}
            <div className="relative">
              <Star className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none bg-slate-50/50 cursor-pointer appearance-none"
              >
                <option value="All">All Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </select>
            </div>

            {/* Staff filter */}
            <div className="relative">
              <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <select
                value={staffFilter}
                onChange={(e) => setStaffFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none bg-slate-50/50 cursor-pointer appearance-none"
              >
                <option value="All">All Staff</option>
                {staffUsers.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* Client Filter */}
            <div className="relative">
              <UserIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <select
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs focus:ring-1 focus:ring-[#D4AF37] focus:outline-none bg-slate-50/50 cursor-pointer appearance-none"
              >
                <option value="All">All Clients</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ACTIVE WORKFLOWS LIST */}
          {visibleWorkflows.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
              <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="font-display font-bold text-slate-700 text-sm">No Workflows Registered</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                No active compliance tracks match your current filters. Tap "Launch Workflow" above to initialize a live compliance engine for an active client.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              
              {/* Left: Active workflows grid */}
              <div className="lg:col-span-8 space-y-4">
                {visibleWorkflows.map((wf) => {
                  const tm = templates.find(t => t.id === wf.templateId);
                  const currentStageName = tm?.stages[wf.currentStageIndex] || DEFAULT_STAGES[wf.currentStageIndex];
                  const totalStagesCount = tm ? tm.stages.length : DEFAULT_STAGES.length;
                  const progressPercentage = Math.round(((wf.currentStageIndex + 1) / totalStagesCount) * 100);
                  
                  // Compute status color
                  let statusBg = "bg-slate-100 text-slate-700 border-slate-200";
                  if (wf.status === "Completed") statusBg = "bg-emerald-50 text-emerald-700 border-emerald-100";
                  else if (wf.status === "Document Pending") statusBg = "bg-amber-50 text-amber-700 border-amber-100";
                  else if (wf.status === "Verification Pending") statusBg = "bg-cyan-50 text-cyan-700 border-cyan-100";
                  else if (wf.status === "Ready to File") statusBg = "bg-indigo-50 text-indigo-700 border-indigo-100";
                  else if (wf.status === "Filed") statusBg = "bg-blue-50 text-blue-700 border-blue-100";
                  else if (wf.status === "Cancelled" || wf.status === "Rejected") statusBg = "bg-rose-50 text-rose-700 border-rose-100";
                  else if (wf.status === "On Hold") statusBg = "bg-purple-50 text-purple-700 border-purple-100";

                  const isSelected = selectedWorkflow?.id === wf.id;

                  return (
                    <motion.div
                      layoutId={`wf_card_${wf.id}`}
                      key={wf.id}
                      onClick={() => setSelectedWorkflow(wf)}
                      className={`bg-white rounded-2xl border transition-all shadow-sm overflow-hidden cursor-pointer ${
                        isSelected 
                          ? "ring-2 ring-[#D4AF37] border-transparent shadow-md" 
                          : "border-slate-100 hover:border-slate-200 hover:shadow"
                      }`}
                    >
                      {/* Top status header banner */}
                      <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-black text-slate-400 uppercase bg-slate-200/50 px-2 py-0.5 rounded">
                            {wf.id}
                          </span>
                          <span className="font-display font-extrabold text-[#0D2C6C] text-xs">
                            {wf.serviceCode} • {wf.serviceName}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] uppercase font-extrabold rounded-full border ${statusBg}`}>
                          {wf.status}
                        </span>
                      </div>

                      {/* Content block */}
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-1">
                            <h4 className="font-display font-extrabold text-sm text-slate-800 leading-tight">
                              {wf.clientName}
                            </h4>
                            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-medium">
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3 text-slate-400" />
                                Assigned Staff: <span className="font-bold text-slate-700">{wf.assignedStaffName}</span>
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Due Date: <span className="font-bold text-slate-700">{wf.dueDate}</span>
                              </span>
                            </div>
                          </div>
                          
                          {/* Progress Circle or Indicator */}
                          <div className="text-right shrink-0">
                            <span className="text-lg font-display font-black text-[#0D2C6C]">{progressPercentage}%</span>
                            <span className="block text-[9px] font-extrabold uppercase text-slate-400 tracking-wider">Completed</span>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-500">Current Track Stage:</span>
                            <span className="font-bold text-[#D4AF37] uppercase tracking-wider">{currentStageName}</span>
                          </div>
                          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-[#0D2C6C] to-[#D4AF37] h-full rounded-full transition-all duration-300" 
                              style={{ width: `${progressPercentage}%` }}
                            />
                          </div>
                        </div>

                        {/* Summary details indicators */}
                        <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center text-[11px] text-slate-500 font-semibold">
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="block text-slate-800 font-display font-extrabold text-sm">
                              {wf.requiredDocuments.filter(d => d.status === "Verified").length}/{wf.requiredDocuments.length}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">Docs Verified</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="block text-slate-800 font-display font-extrabold text-sm">
                              {wf.tasks.filter(t => t.status === "Completed").length}/{wf.tasks.length}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">Tasks Done</span>
                          </div>
                          <div className="bg-slate-50 p-2 rounded-xl">
                            <span className="block text-slate-800 font-display font-extrabold text-sm">
                              {wf.notes.length}
                            </span>
                            <span className="text-[9px] uppercase font-bold text-slate-400">Active Notes</span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Right: Dynamic Interactive Panel (selected workflow details) */}
              <div className="lg:col-span-4">
                {selectedWorkflow ? (
                  <motion.div 
                    layoutId={`wf_details_panel`}
                    className="bg-white rounded-3xl border border-slate-100 shadow-xl p-5 space-y-6 sticky top-6"
                  >
                    
                    {/* Panel Title & Close */}
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div>
                        <span className="text-[10px] font-mono font-bold uppercase text-[#D4AF37] bg-[#0D2C6C]/10 px-2 py-0.5 rounded">
                          {selectedWorkflow.id}
                        </span>
                        <h3 className="font-display font-black text-sm text-[#0D2C6C] mt-1">Compliance Workspace</h3>
                      </div>
                      <button 
                        onClick={() => setSelectedWorkflow(null)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-50 hover:bg-slate-100 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Progress Controls */}
                    <div className="space-y-2">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Update Compliance Stage</h4>
                      <div className="flex items-center justify-between gap-2 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <button
                          onClick={() => handleUpdateWorkflowStage(selectedWorkflow.id, -1)}
                          disabled={selectedWorkflow.currentStageIndex === 0}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          Prev
                        </button>
                        
                        <div className="text-center">
                          <span className="block text-xs font-black text-[#0D2C6C]">
                            {templates.find(t => t.id === selectedWorkflow.templateId)?.stages[selectedWorkflow.currentStageIndex] || DEFAULT_STAGES[selectedWorkflow.currentStageIndex]}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Stage {selectedWorkflow.currentStageIndex + 1} of {templates.find(t => t.id === selectedWorkflow.templateId)?.stages.length || DEFAULT_STAGES.length}</span>
                        </div>

                        <button
                          onClick={() => handleUpdateWorkflowStage(selectedWorkflow.id, 1)}
                          disabled={selectedWorkflow.currentStageIndex === (templates.find(t => t.id === selectedWorkflow.templateId)?.stages.length || DEFAULT_STAGES.length) - 1}
                          className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                        >
                          Next
                        </button>
                      </div>

                      {/* Status override dropdown */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Track Status</label>
                          <select
                            value={selectedWorkflow.status}
                            onChange={(e) => handleUpdateWorkflowStatus(selectedWorkflow.id, e.target.value as any)}
                            className="w-full mt-1 px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:ring-1 focus:ring-[#D4AF37] focus:outline-none cursor-pointer"
                          >
                            {WORKFLOW_STATUSES.map(s => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase">Primary Owner</label>
                          <div className="w-full mt-1 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 font-bold overflow-hidden text-ellipsis whitespace-nowrap">
                            {selectedWorkflow.assignedStaffName}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: DOCUMENT CHECKLIST VAULT */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Required Document Vault</h4>
                        <span className="text-[9px] font-bold text-slate-400">
                          {selectedWorkflow.requiredDocuments.filter(d => d.status === "Verified").length} verified
                        </span>
                      </div>
                      
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {selectedWorkflow.requiredDocuments.map((doc, idx) => {
                          let statusColor = "text-amber-500";
                          let statusBg = "bg-amber-500/10";
                          if (doc.status === "Verified") {
                            statusColor = "text-emerald-500";
                            statusBg = "bg-emerald-500/10";
                          } else if (doc.status === "Rejected") {
                            statusColor = "text-rose-500";
                            statusBg = "bg-rose-500/10";
                          } else if (doc.status === "Uploaded") {
                            statusColor = "text-blue-500";
                            statusBg = "bg-blue-500/10";
                          }

                          return (
                            <div key={idx} className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-black text-slate-700">{doc.name}</span>
                                <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-extrabold ${statusColor} ${statusBg}`}>
                                  {doc.status}
                                </span>
                              </div>
                              
                              {/* If document is uploaded, show verification controls to Owner */}
                              {doc.status === "Uploaded" && (
                                <div className="space-y-1">
                                  <div className="text-[10px] text-slate-400 font-mono italic">
                                    File: {doc.fileName} (by {doc.uploadedBy?.split("@")[0]})
                                  </div>
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleVerifyDocument(selectedWorkflow.id, doc.name, true)}
                                      className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Verify
                                    </button>
                                    <button
                                      onClick={() => {
                                        const reason = prompt("Enter rejection reason:") || "Incomplete/blur image";
                                        handleVerifyDocument(selectedWorkflow.id, doc.name, false, reason);
                                      }}
                                      className="flex-1 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                </div>
                              )}

                              {doc.status === "Verified" && (
                                <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  <span>Verified by Owner</span>
                                </div>
                              )}

                              {doc.status === "Rejected" && (
                                <div className="text-[10px] text-rose-500 font-semibold space-y-0.5">
                                  <span>Rejected: {doc.rejectionReason}</span>
                                </div>
                              )}

                              {doc.status === "Pending" && (
                                <button
                                  onClick={() => {
                                    const mockName = `${doc.name.toLowerCase()}_secure_scan.pdf`;
                                    handleUploadDocument(selectedWorkflow.id, doc.name, { name: mockName, type: "application/pdf" });
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 py-1.5 border border-dashed border-slate-300 hover:border-slate-400 rounded-lg text-[10px] text-slate-500 hover:text-slate-700 bg-white font-bold cursor-pointer"
                                >
                                  <Paperclip className="w-3 h-3" />
                                  <span>Secure Upload Mock</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* SECTION: TASK REGISTER ENGINE */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Track Tasks Register</h4>
                      
                      {/* Active Tasks List */}
                      <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                        {selectedWorkflow.tasks.map(t => (
                          <div key={t.id} className="flex items-start gap-2.5 p-2.5 border border-slate-100 hover:border-slate-200 bg-slate-50/50 rounded-xl transition-all">
                            <input
                              type="checkbox"
                              checked={t.status === "Completed"}
                              onChange={() => handleToggleTaskStatus(selectedWorkflow.id, t.id)}
                              className="w-4 h-4 mt-0.5 accent-emerald-600 rounded cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`block text-xs font-semibold leading-snug ${t.status === "Completed" ? "line-through text-slate-400" : "text-slate-700"}`}>
                                {t.title}
                              </span>
                              <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400 font-bold">
                                <span className="text-[#0D2C6C] bg-[#0D2C6C]/5 px-1.5 py-0.5 rounded">{t.assignedStaffName}</span>
                                <span>•</span>
                                <span>Due: {t.dueDate}</span>
                                <span>•</span>
                                <span className={`uppercase text-[8px] font-black ${t.priority === "Critical" ? "text-red-500" : t.priority === "High" ? "text-amber-500" : "text-slate-400"}`}>
                                  {t.priority}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Add Dynamic Task Trigger */}
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                        <input
                          type="text"
                          placeholder="Task title..."
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <select
                            value={newTaskStaffId}
                            onChange={(e) => setNewTaskStaffId(e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="">Assign Staff...</option>
                            {staffUsers.map(u => (
                              <option key={u.id} value={u.id}>{u.name}</option>
                            ))}
                          </select>
                          <select
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value as any)}
                            className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Critical">Critical</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={newTaskDueDate}
                            onChange={(e) => setNewTaskDueDate(e.target.value)}
                            className="flex-1 px-2 py-1 border border-slate-200 rounded-lg text-[11px] bg-white text-slate-700 focus:outline-none"
                          />
                          <button
                            onClick={() => handleAddCustomTask(selectedWorkflow.id)}
                            className="px-3 bg-[#D4AF37] hover:bg-[#B5912A] text-[#0D2C6C] font-black rounded-lg text-[11px] cursor-pointer"
                          >
                            Add Task
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SECTION: INTERNAL NOTES (OWNER, STAFF, CLIENT) */}
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Segmented Notes Console</h4>
                      
                      {/* Segment selector */}
                      <div className="grid grid-cols-4 gap-1 p-0.5 bg-slate-100 rounded-lg text-[9px] font-bold text-center">
                        <button 
                          onClick={() => setNewNoteType("INTERNAL")}
                          className={`py-1 rounded cursor-pointer ${newNoteType === "INTERNAL" ? "bg-white text-slate-800 shadow-sm" : "text-slate-400"}`}
                        >
                          Internal
                        </button>
                        <button 
                          onClick={() => setNewNoteType("OWNER")}
                          className={`py-1 rounded cursor-pointer ${newNoteType === "OWNER" ? "bg-[#0D2C6C] text-white shadow-sm" : "text-slate-400"}`}
                        >
                          Owner
                        </button>
                        <button 
                          onClick={() => setNewNoteType("STAFF")}
                          className={`py-1 rounded cursor-pointer ${newNoteType === "STAFF" ? "bg-amber-500 text-slate-900 shadow-sm" : "text-slate-400"}`}
                        >
                          Staff
                        </button>
                        <button 
                          onClick={() => setNewNoteType("CLIENT")}
                          className={`py-1 rounded cursor-pointer ${newNoteType === "CLIENT" ? "bg-indigo-600 text-white shadow-sm" : "text-slate-400"}`}
                        >
                          Client
                        </button>
                      </div>

                      {/* Display segmented notes */}
                      <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                        {selectedWorkflow.notes.length === 0 ? (
                          <div className="text-center py-4 text-[10px] text-slate-400 italic">No notes created yet.</div>
                        ) : (
                          selectedWorkflow.notes.map(note => {
                            let typeBg = "bg-slate-100 text-slate-700";
                            if (note.type === "OWNER") typeBg = "bg-[#0D2C6C] text-white";
                            else if (note.type === "STAFF") typeBg = "bg-amber-100 text-amber-800";
                            else if (note.type === "CLIENT") typeBg = "bg-indigo-50 text-indigo-800";

                            return (
                              <div key={note.id} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-1">
                                <div className="flex items-center justify-between text-[9px]">
                                  <span className={`px-1.5 py-0.2 rounded font-black text-[8px] uppercase ${typeBg}`}>
                                    {note.type}
                                  </span>
                                  <span className="text-slate-400 font-bold">{note.authorName.split(" ")[0]} • {note.timestamp.split("T")[0]}</span>
                                </div>
                                <p className="text-slate-600 font-sans leading-relaxed">{note.content}</p>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Add Note Area */}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder={`Add ${newNoteType.toLowerCase()} note...`}
                          value={newNoteContent}
                          onChange={(e) => setNewNoteContent(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddWorkflowNote(selectedWorkflow.id)}
                          className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                        />
                        <button
                          onClick={() => handleAddWorkflowNote(selectedWorkflow.id)}
                          className="px-3 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-900 cursor-pointer"
                        >
                          Save
                        </button>
                      </div>
                    </div>

                    {/* SECTION: TIMELINE LOG */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Chronological Timeline Track</h4>
                      <div className="space-y-3 max-h-40 overflow-y-auto pr-1">
                        {selectedWorkflow.timeline.slice().reverse().map(event => (
                          <div key={event.id} className="flex gap-3 text-xs">
                            <div className="flex flex-col items-center shrink-0">
                              <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-1.5"></div>
                              <div className="w-px h-full bg-slate-200"></div>
                            </div>
                            <div className="space-y-0.5">
                              <span className="block font-bold text-slate-800 leading-none">{event.title}</span>
                              <p className="text-[11px] text-slate-500 leading-normal">{event.details}</p>
                              <span className="block text-[9px] text-slate-400 font-bold">
                                {event.userName.split(" ")[0]} • {new Date(event.timestamp).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </motion.div>
                ) : (
                  <div className="bg-slate-50 rounded-3xl border border-dashed border-slate-200 p-8 text-center sticky top-6">
                    <Activity className="w-10 h-10 text-slate-300 mx-auto mb-2.5 animate-pulse" />
                    <h4 className="font-display font-bold text-slate-600 text-xs">Interactive Panel Active</h4>
                    <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                      Select any workflow profile from the Workspace Ledger to view active document vaults, dynamic task checklists, chronological timelines, and segmented internal notes.
                    </p>
                  </div>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* DYNAMIC BLUEPRINTS / TEMPLATES TAB */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          
          {/* Overview alert for Owner */}
          <div className="p-4 bg-amber-50/50 border border-[#D4AF37]/30 rounded-2xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-bold text-[#0D2C6C]">Dynamic Workflow Blueprint Designer:</span>
              <p className="text-slate-600 mt-0.5 leading-relaxed">
                As the managing CA or owner, you can override default workflow stages and documents required per regulatory service. Each new launched client assignment instantly inherits these exact blueprint constraints. No elements are hardcoded.
              </p>
            </div>
          </div>

          {/* Blueprint Grid */}
          {templates.filter(t => !t.isArchived).length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-100 p-12 text-center shadow-sm">
              <SettingsIcon className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h4 className="font-display font-bold text-slate-700 text-sm">No Blueprint Models Registered</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                All services currently use default system pipelines. Press "Configure Service Template" to create a unique custom workflow model.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.filter(t => !t.isArchived).map(temp => (
                <div 
                  key={temp.id} 
                  className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4 relative overflow-hidden flex flex-col justify-between ${
                    !temp.isActive ? "opacity-60 bg-slate-50/50" : ""
                  }`}
                >
                  <div className="space-y-3">
                    
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase bg-slate-100 px-1.5 py-0.5 rounded">
                          {temp.id}
                        </span>
                        <h4 className="font-display font-extrabold text-[#0D2C6C] text-sm mt-1">{temp.serviceName}</h4>
                        <span className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">{temp.serviceCode}</span>
                      </div>
                      
                      {/* Enabled/Disabled Toggle indicator */}
                      <span className={`px-2 py-0.5 rounded text-[9px] uppercase font-bold border ${
                        temp.isActive 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                          : "bg-slate-100 text-slate-400 border-slate-200"
                      }`}>
                        {temp.isActive ? "Active Model" : "Disabled"}
                      </span>
                    </div>

                    {/* Summary of stages */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Workflow Pipeline ({temp.stages.length} Stages)</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                        {temp.stages.map((stage, sIdx) => (
                          <span key={sIdx} className="bg-slate-50 border border-slate-100 text-[10px] text-slate-600 px-2 py-0.5 rounded">
                            {stage}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Required Documents summary */}
                    <div className="space-y-1">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Required Document Vault Checklist ({temp.requiredDocuments.length})</span>
                      <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto pr-1">
                        {temp.requiredDocuments.map((doc, dIdx) => (
                          <span key={dIdx} className="bg-amber-500/10 border border-amber-500/20 text-[#0D2C6C] text-[10px] font-bold px-2 py-0.5 rounded">
                            {doc}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Automation rules info */}
                    <div className="pt-3 border-t border-slate-100 space-y-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-wide">Automation Configuration</span>
                      <div className="grid grid-cols-2 gap-1 text-[10px] font-semibold text-slate-500">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Due Limit: {temp.autoDueDateDays} days</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-slate-400" />
                          <span>Auto status: {temp.autoStatusChange ? "ON" : "OFF"}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Actions footer */}
                  {canModifyConfig && (
                    <div className="flex items-center gap-1.5 pt-4 border-t border-slate-100 mt-4">
                      <button
                        onClick={() => openEditTemplateModal(temp)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleCloneTemplate(temp)}
                        className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition-colors"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Clone</span>
                      </button>
                      <button
                        onClick={() => handleToggleTemplateActive(temp.id)}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer transition-colors ${
                          temp.isActive 
                            ? "bg-amber-50 text-amber-700 hover:bg-amber-100" 
                            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        <span>{temp.isActive ? "Disable" : "Enable"}</span>
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Are you sure you want to archive this template?")) {
                            handleArchiveTemplate(temp.id);
                          }
                        }}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer"
                        title="Archive Model"
                      >
                        <Archive className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

        </div>
      )}

      {/* DYNAMIC MODAL: CREATE ACTIVE WORKFLOW */}
      <AnimatePresence>
        {showCreateWorkflowModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1C40]/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-base text-[#0D2C6C]">Launch Compliance Workflow Track</h3>
                <button 
                  onClick={() => setShowCreateWorkflowModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateActiveWorkflow} className="space-y-4">
                
                {/* Client select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Select Target Client Profile</label>
                  <select
                    value={newWfClientId}
                    onChange={(e) => setNewWfClientId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Client --</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.id})</option>
                    ))}
                  </select>
                </div>

                {/* Service select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Select Service Dynamic Rule</label>
                  <select
                    value={newWfServiceId}
                    onChange={(e) => setNewWfServiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Service --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                {/* Staff assign */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Assign Primary Staff</label>
                    <select
                      value={newWfStaffId}
                      onChange={(e) => setNewWfStaffId(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Staff --</option>
                      {staffUsers.map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.designation})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 uppercase">Track Priority</label>
                    <select
                      value={newWfPriority}
                      onChange={(e) => setNewWfPriority(e.target.value as any)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                      <option value="Critical">Critical</option>
                    </select>
                  </div>
                </div>

                {/* Target Due date */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Target Deadline Due Date</label>
                  <input
                    type="date"
                    value={newWfDueDate}
                    onChange={(e) => setNewWfDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                  />
                  <p className="text-[10px] text-slate-400 italic font-mono">
                    If empty, auto due date rule configured on the template will apply.
                  </p>
                </div>

                {/* Submit */}
                <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowCreateWorkflowModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B5912A] text-[#0D2C6C] text-xs font-black rounded-xl cursor-pointer shadow-md"
                  >
                    Spawn Active Track
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DYNAMIC MODAL: CONFIGURE BLUEPRINT TEMPLATE */}
      <AnimatePresence>
        {showTemplateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0A1C40]/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-display font-extrabold text-base text-[#0D2C6C]">
                  {templateFormId ? "Edit Compliance Blueprint Model" : "Design New Compliance Blueprint"}
                </h3>
                <button 
                  onClick={() => setShowTemplateModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded bg-slate-50 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveTemplateForm} className="space-y-4">
                
                {/* Service dynamic select */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase">Select Target Compliance Service</label>
                  <select
                    value={templateServiceId}
                    onChange={(e) => setTemplateServiceId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#D4AF37] cursor-pointer"
                    disabled={!!templateFormId}
                    required
                  >
                    <option value="">-- Choose Regulatory Service --</option>
                    {services.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                    ))}
                  </select>
                </div>

                {/* Automation Rules */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-[#0D2C6C] uppercase">Dynamic Automation Rules</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Auto Due Limit (Days)</label>
                      <input
                        type="number"
                        min="1"
                        max="365"
                        value={autoDueDateDays}
                        onChange={(e) => setAutoDueDateDays(parseInt(e.target.value, 10) || 15)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#D4AF37]"
                        required
                      />
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="autoStatusChange"
                        checked={autoStatusChange}
                        onChange={(e) => setAutoStatusChange(e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                      />
                      <label htmlFor="autoStatusChange" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                        Auto Status Change
                      </label>
                    </div>
                    <div className="flex items-center gap-2 pt-4">
                      <input
                        type="checkbox"
                        id="autoInvoiceEligibility"
                        checked={autoInvoiceEligibility}
                        onChange={(e) => setAutoInvoiceEligibility(e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] rounded cursor-pointer"
                      />
                      <label htmlFor="autoInvoiceEligibility" className="text-[11px] font-bold text-slate-600 cursor-pointer">
                        Auto Invoice Eligible
                      </label>
                    </div>
                  </div>
                </div>

                {/* Pipeline Stages Designer */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Configure Workflow Pipeline Stages</label>
                  
                  {/* Stages listing */}
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border border-slate-100 p-2.5 rounded-2xl bg-slate-50">
                    {templateStages.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic text-center py-4">No stages configured. Default tracking list will be applied.</p>
                    ) : (
                      templateStages.map((stage, sIdx) => (
                        <div key={sIdx} className="flex items-center justify-between bg-white px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-bold">{sIdx + 1}.</span>
                            {stage}
                          </span>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleReorderFormStage(sIdx, "up")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer"
                              title="Move Stage Up"
                            >
                              <Check className="w-3.5 h-3.5 rotate-180 text-[#D4AF37] stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReorderFormStage(sIdx, "down")}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 cursor-pointer"
                              title="Move Stage Down"
                            >
                              <Check className="w-3.5 h-3.5 text-[#0D2C6C] stroke-[3]" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveFormStage(sIdx)}
                              className="p-1 hover:bg-rose-50 text-rose-500 rounded cursor-pointer"
                              title="Remove Stage"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Stage input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add custom step stage (e.g. Internal CA Verification)..."
                      value={newStageInput}
                      onChange={(e) => setNewStageInput(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-xl text-xs bg-white text-slate-700 focus:outline-none placeholder-slate-400 focus:ring-1 focus:ring-[#D4AF37]"
                    />
                    <button
                      type="button"
                      onClick={handleAddFormStage}
                      className="px-4 bg-[#0D2C6C] text-white font-bold rounded-xl text-xs hover:bg-[#081B40] cursor-pointer"
                    >
                      Add Stage
                    </button>
                  </div>
                </div>

                {/* Required Documents Vault Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-slate-500 uppercase block">Required Document Vault Checklist</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 p-3 border border-slate-100 bg-slate-50/50 rounded-2xl max-h-40 overflow-y-auto">
                    {STANDARD_DOCUMENTS.map(doc => {
                      const isChecked = templateDocs.includes(doc);
                      return (
                        <div 
                          key={doc}
                          onClick={() => handleToggleFormDoc(doc)}
                          className={`flex items-center gap-2 p-2 border rounded-xl text-xs font-semibold cursor-pointer select-none transition-all ${
                            isChecked 
                              ? "bg-amber-500/10 border-[#D4AF37]/50 text-[#0D2C6C]" 
                              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            readOnly
                            className="w-3.5 h-3.5 accent-[#D4AF37] rounded"
                          />
                          <span>{doc}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-xl hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#D4AF37] hover:bg-[#B5912A] text-[#0D2C6C] text-xs font-black rounded-xl cursor-pointer shadow-md"
                  >
                    Save Model Blueprint
                  </button>
                </div>

              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
