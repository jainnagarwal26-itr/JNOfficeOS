/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Case, CaseStatus, CasePriority, CaseChecklistItem, CaseAttachment, CaseTimelineEvent, CaseNote, CaseInvoice, CasePayment, User, UserRole } from "../types";
import { googleSheetsService } from "./googleSheetsService";
import { addAuditLog } from "./db";

const REPO_STORAGE_KEYS = {
  CASES: "jn_officeos_cases",
  CASES_COUNTER: "jn_officeos_cases_counter"
};

const DEFAULT_CHECKLISTS: Record<string, string[]> = {
  "GST": [
    "PAN Received",
    "Aadhaar Received",
    "DSC Available",
    "GSTIN Credentials Verified",
    "Purchase Register Reconciled",
    "GSTR-1 Drafted",
    "GSTR-3B Prepared",
    "OTP Completed",
    "Filing Submitted on Portal",
    "Acknowledgement Downloaded",
    "Invoice Sent"
  ],
  "Income Tax": [
    "PAN Received",
    "Aadhaar Received",
    "Form 26AS/AIS/TIS Checked",
    "Bank Statements Verified",
    "Computation Sheets Prepared",
    "ITR Form Selected",
    "DSC Signed / OTP Received",
    "E-filed on Portal",
    "ITR-V Downloaded",
    "Invoice Sent"
  ],
  "Audit": [
    "Appointment Letter Received",
    "Engagement Letter Signed",
    "Trial Balance Reconciled",
    "Vouching Completed",
    "Ledger Verification",
    "Tax Audit Report Form 3CD Drafted",
    "Management Representation Letter",
    "UDIN Generated",
    "Report Filed on Income Tax Portal",
    "Invoice Sent"
  ],
  "Default": [
    "Client Kyc Verification",
    "PAN & Aadhaar Received",
    "DSC Verification",
    "Portal Login Authentication",
    "Work Under processing",
    "Draft Shared with Client",
    "Approved and Finalized",
    "Filing/Submission Completed",
    "Acknowledgement Downloaded",
    "Invoice Raised",
    "Payment Received"
  ]
};

const DEFAULT_INITIAL_CASES: Case[] = [
  {
    id: "CASE-2026-0001",
    clientId: "CL000001",
    clientName: "Anchal Baleshwar Chobe",
    serviceId: "SRV_GST_001",
    serviceName: "GST Monthly Return Filing (GSTR-3B & GSTR-1)",
    status: "Work Started",
    priority: "High",
    assignedStaffIds: ["usr_owner_001", "usr_1785150741148"],
    checklist: [
      { id: "chk_1", task: "Purchase Register Reconciled", isCompleted: true },
      { id: "chk_2", task: "GSTR-1 Drafted", isCompleted: true },
      { id: "chk_3", task: "GSTR-3B Prepared", isCompleted: false }
    ],
    timeline: [
      { id: "t_1", timestamp: "2026-07-25T11:00:00.000Z", title: "Case Created", type: "SYSTEM", details: "GST Monthly Return Filing case initiated for client.", userEmail: "jainnagarwal26@gmail.com", userName: "Chirag Jain" }
    ],
    notes: [
      { id: "n_1", timestamp: "2026-07-26T10:00:00.000Z", authorName: "Chirag Jain", text: "2A/2B Reconciliation completed. Purchase ITC verified." }
    ],
    invoices: [],
    payments: [],
    attachments: [],
    createdAt: "2026-07-25T10:00:00.000Z",
    expectedCompletionDate: "2026-07-31",
    updatedAt: "2026-07-26T10:00:00.000Z"
  },
  {
    id: "CASE-2026-0002",
    clientId: "CL000002",
    clientName: "KRISHNAKUMAR HEERALAL KANOJIYA",
    serviceId: "SRV_ITR_002",
    serviceName: "Income Tax Return Filing (ITR-3 Business & Profession)",
    status: "Documents Pending",
    priority: "Medium",
    assignedStaffIds: ["usr_owner_001", "usr_1785150741148"],
    checklist: [
      { id: "chk_4", task: "Form 26AS/AIS/TIS Downloaded", isCompleted: true },
      { id: "chk_5", task: "Bank Statements Verified", isCompleted: false }
    ],
    timeline: [],
    notes: [],
    invoices: [],
    payments: [],
    attachments: [],
    createdAt: "2026-07-25T12:00:00.000Z",
    expectedCompletionDate: "2026-08-10",
    updatedAt: "2026-07-25T12:00:00.000Z"
  },
  {
    id: "CASE-2026-0003",
    clientId: "CL000003",
    clientName: "Parag Kadam",
    serviceId: "SRV_AUDIT_003",
    serviceName: "Tax Audit Report (Form 3CD & 3CB)",
    status: "Work Started",
    priority: "Critical",
    assignedStaffIds: ["usr_owner_001"],
    checklist: [
      { id: "chk_6", task: "Trial Balance Reconciled", isCompleted: true },
      { id: "chk_7", task: "Vouching Completed", isCompleted: true },
      { id: "chk_8", task: "Form 3CD Drafted", isCompleted: false }
    ],
    timeline: [],
    notes: [],
    invoices: [],
    payments: [],
    attachments: [],
    createdAt: "2026-07-26T09:00:00.000Z",
    expectedCompletionDate: "2026-08-15",
    updatedAt: "2026-07-26T09:00:00.000Z"
  }
];

// Primary Repository Layer class to manage Cases
export class CaseRepository {
  private static casesCache: Case[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    
    const stored = localStorage.getItem(REPO_STORAGE_KEYS.CASES);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        this.casesCache = Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_INITIAL_CASES;
      } catch (e) {
        console.error("Failed to parse stored cases", e);
        this.casesCache = DEFAULT_INITIAL_CASES;
      }
    } else {
      this.casesCache = DEFAULT_INITIAL_CASES;
      localStorage.setItem(REPO_STORAGE_KEYS.CASES, JSON.stringify(this.casesCache));
    }
    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(REPO_STORAGE_KEYS.CASES, JSON.stringify(this.casesCache));

    // Real-Time Enterprise Supabase RDBMS Sync
    import("./supabaseService").then(({ supabaseService }) => {
      this.casesCache.forEach(c => {
        supabaseService.upsertCase(c);
      });
    });
    // Production Sync to Google Sheets
    import("./googleSheetsService").then(({ googleSheetsService }) => {
      if (googleSheetsService.isActiveSyncEnabled()) {
        const mapped = this.casesCache.map((c) => ({
          "Case ID": c.id,
          "Case_ID": c.id,
          "Client ID": c.clientId || "",
          "Client_ID": c.clientId || "",
          "Client Name": c.clientName,
          "Client_Name": c.clientName,
          "Service ID": c.serviceId || "",
          "Service_ID": c.serviceId || "",
          "Service Name": c.serviceName,
          "Service_Name": c.serviceName,
          "Status": c.status,
          "Priority": c.priority,
          "Staff_ID": c.assignedStaffIds.join(", "),
          "Assigned Staff IDs": c.assignedStaffIds.join(", "),
          "Progress": c.checklist.length > 0 ? Math.round((c.checklist.filter(item => item.isCompleted).length / c.checklist.length) * 100) : 0,
          "Progress_Pct": c.checklist.length > 0 ? Math.round((c.checklist.filter(item => item.isCompleted).length / c.checklist.length) * 100) : 0,
          "Start Date": c.createdAt,
          "Start_Date": c.createdAt,
          "Target Date": c.expectedCompletionDate,
          "Target_Date": c.expectedCompletionDate,
          "Updated At": c.updatedAt,
          "Updated_At": c.updatedAt,
          "Is_Demo": false
        }));
        googleSheetsService.bulkSync("Cases", "Case ID", mapped);
      }
    });
  }

  public static getCases(currentUser: User): Case[] {
    this.init();
    
    // RBAC: Staff can only access Cases where they are assigned, OR if their permissions allow.
    // Let's filter cases based on user role and assigned staff.
    if (currentUser.role === UserRole.OWNER) {
      return this.casesCache;
    }

    // For Staff, filter where they are in assignedStaffIds
    return this.casesCache.filter(c => c.assignedStaffIds.includes(currentUser.id));
  }

  public static getCaseById(id: string, currentUser: User): Case | null {
    this.init();
    const found = this.casesCache.find(c => c.id === id);
    if (!found) return null;

    // RBAC check
    if (currentUser.role !== UserRole.OWNER && !found.assignedStaffIds.includes(currentUser.id)) {
      return null;
    }
    return found;
  }

  // Auto-generate next unique case number (Format: CASE-2026-XXXXXX)
  private static getNextCaseNumber(): string {
    const counterStr = localStorage.getItem(REPO_STORAGE_KEYS.CASES_COUNTER);
    let nextNum = 1;
    if (counterStr) {
      nextNum = parseInt(counterStr, 10) + 1;
    } else {
      nextNum = this.casesCache.length + 1;
    }
    localStorage.setItem(REPO_STORAGE_KEYS.CASES_COUNTER, nextNum.toString());
    const padded = nextNum.toString().padStart(6, "0");
    return `CASE-2026-${padded}`;
  }

  public static createCase(
    clientId: string,
    clientName: string,
    serviceId: string,
    serviceName: string,
    serviceType: string,
    assignedStaffIds: string[],
    priority: CasePriority,
    expectedCompletionDate: string,
    customChecklist: string[] | null,
    currentUser: User
  ): Case {
    this.init();

    const id = this.getNextCaseNumber();
    const timestamp = new Date().toISOString();

    // Setup checklist
    const checklistTitles = customChecklist && customChecklist.length > 0 
      ? customChecklist 
      : (DEFAULT_CHECKLISTS[serviceType] || DEFAULT_CHECKLISTS["Default"]);
    
    const checklist: CaseChecklistItem[] = checklistTitles.map((title, index) => ({
      id: `chk_item_${id}_${index}_${Date.now()}`,
      title,
      isCompleted: false
    }));

    const status: CaseStatus = assignedStaffIds.length > 0 ? "Assigned" : "Draft";

    const newCase: Case = {
      id,
      clientId,
      clientName,
      assignedStaffIds,
      serviceId,
      serviceName,
      serviceType,
      priority,
      status,
      createdAt: timestamp,
      expectedCompletionDate,
      checklist,
      attachments: [],
      notes: [],
      timeline: [
        {
          id: `evt_created_${Date.now()}`,
          timestamp,
          title: "Case Created",
          details: `Case initiated for client '${clientName}' under service category [${serviceType}].`,
          userEmail: currentUser.email,
          userName: currentUser.name
        }
      ],
      updatedAt: timestamp
    };

    if (assignedStaffIds.length > 0) {
      newCase.timeline.push({
        id: `evt_assigned_${Date.now() + 1}`,
        timestamp,
        title: "Assigned",
        details: `Case assigned to selected staff members.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      });
    }

    this.casesCache.unshift(newCase);
    this.persist();

    // Write to Google Sheets
    googleSheetsService.syncCase(newCase);
    newCase.timeline.forEach(evt => googleSheetsService.syncTimeline(newCase.id, evt));
    newCase.checklist.forEach(item => googleSheetsService.syncChecklistItem(newCase.id, item));

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "CASE_CREATED",
      "DATABASE",
      `Enterprise Case '${newCase.id}' created successfully for client '${clientName}' [Service: ${serviceName}].`
    );

    return newCase;
  }

  public static updateCase(
    caseId: string,
    updates: Partial<Pick<Case, "status" | "priority" | "assignedStaffIds" | "expectedCompletionDate" | "workflowId">>,
    currentUser: User
  ): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) {
      throw new Error(`Case with ID ${caseId} not found.`);
    }

    const currentCase = this.casesCache[caseIndex];
    const timestamp = new Date().toISOString();
    
    // Check RBAC
    if (currentUser.role !== UserRole.OWNER && !currentCase.assignedStaffIds.includes(currentUser.id)) {
      throw new Error("Access Denied: You are not authorized to update this case.");
    }

    const updatedCase: Case = {
      ...currentCase,
      ...updates,
      updatedAt: timestamp
    };

    // If status updated to Completed, record completedDate
    if (updates.status === "Completed" && currentCase.status !== "Completed") {
      updatedCase.completedDate = timestamp.split("T")[0];
    } else if (updates.status && updates.status !== "Completed") {
      updatedCase.completedDate = undefined;
    }

    // Auto-generate Timeline entry for each change
    const events: CaseTimelineEvent[] = [];
    let logMessage = `Case '${caseId}' modified: `;

    if (updates.status && updates.status !== currentCase.status) {
      const statusEvt: CaseTimelineEvent = {
        id: `evt_status_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
        title: updates.status === "Completed" ? "Completed" : "Status Changed",
        details: `Case status transitioned from '${currentCase.status}' to '${updates.status}'.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      events.push(statusEvt);
      logMessage += `[Status changed to ${updates.status}] `;
    }

    if (updates.priority && updates.priority !== currentCase.priority) {
      const priorityEvt: CaseTimelineEvent = {
        id: `evt_priority_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
        title: "Priority Level Modified",
        details: `Priority level updated from '${currentCase.priority}' to '${updates.priority}'.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      events.push(priorityEvt);
      logMessage += `[Priority changed to ${updates.priority}] `;
    }

    if (updates.assignedStaffIds && JSON.stringify(updates.assignedStaffIds) !== JSON.stringify(currentCase.assignedStaffIds)) {
      const staffEvt: CaseTimelineEvent = {
        id: `evt_assigned_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
        title: "Assigned",
        details: `Case assignment modified. Assigned to ${updates.assignedStaffIds.length} staff member(s).`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      events.push(staffEvt);
      logMessage += `[Assigned staff list updated] `;
    }

    if (updates.expectedCompletionDate && updates.expectedCompletionDate !== currentCase.expectedCompletionDate) {
      const dateEvt: CaseTimelineEvent = {
        id: `evt_date_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        timestamp,
        title: "Expected Completion Updated",
        details: `Target delivery date adjusted from ${currentCase.expectedCompletionDate} to ${updates.expectedCompletionDate}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      };
      events.push(dateEvt);
      logMessage += `[Target delivery set to ${updates.expectedCompletionDate}] `;
    }

    if (events.length > 0) {
      updatedCase.timeline = [...events, ...updatedCase.timeline];
      events.forEach(evt => googleSheetsService.syncTimeline(updatedCase.id, evt));
    }

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    // Sheets Sync Case
    googleSheetsService.syncCase(updatedCase);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "CASE_UPDATED",
      "DATABASE",
      logMessage
    );

    return updatedCase;
  }

  public static addCaseNote(caseId: string, type: CaseNote["type"], content: string, currentUser: User): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) throw new Error("Case not found");

    const currentCase = this.casesCache[caseIndex];
    
    // RBAC
    if (currentUser.role !== UserRole.OWNER && !currentCase.assignedStaffIds.includes(currentUser.id)) {
      throw new Error("Access Denied");
    }

    const timestamp = new Date().toISOString();
    const newNote: CaseNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      type,
      content,
      authorName: currentUser.name,
      authorEmail: currentUser.email,
      timestamp
    };

    const updatedCase: Case = {
      ...currentCase,
      notes: [...currentCase.notes, newNote],
      updatedAt: timestamp
    };

    // Add brief timeline reference
    const noteEvt: CaseTimelineEvent = {
      id: `evt_note_${Date.now()}`,
      timestamp,
      title: "Note Added",
      details: `${type} Note compiled by ${currentUser.name}.`,
      userEmail: currentUser.email,
      userName: currentUser.name
    };
    updatedCase.timeline = [noteEvt, ...updatedCase.timeline];

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    googleSheetsService.syncTimeline(updatedCase.id, noteEvt);

    return updatedCase;
  }

  public static toggleChecklistItem(caseId: string, itemId: string, isCompleted: boolean, currentUser: User): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) throw new Error("Case not found");

    const currentCase = this.casesCache[caseIndex];

    // RBAC check
    if (currentUser.role !== UserRole.OWNER && !currentCase.assignedStaffIds.includes(currentUser.id)) {
      throw new Error("Access Denied");
    }

    const timestamp = new Date().toISOString();
    let checkedTitle = "";

    const updatedChecklist = currentCase.checklist.map(item => {
      if (item.id === itemId) {
        checkedTitle = item.title;
        return {
          ...item,
          isCompleted,
          completedAt: isCompleted ? timestamp : undefined,
          completedBy: isCompleted ? currentUser.name : undefined
        };
      }
      return item;
    });

    // Create dynamic timeline event
    const chkEvt: CaseTimelineEvent = {
      id: `evt_chk_${Date.now()}`,
      timestamp,
      title: isCompleted ? "Checklist Completed" : "Checklist Re-opened",
      details: `Item '${checkedTitle}' marked as ${isCompleted ? "completed" : "pending"} by ${currentUser.name}.`,
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    // Auto-advance Case status if checklist progresses!
    let nextStatus = currentCase.status;
    const completedCount = updatedChecklist.filter(i => i.isCompleted).length;
    
    if (completedCount === updatedChecklist.length && updatedChecklist.length > 0 && currentCase.status !== "Completed" && currentCase.status !== "Filed") {
      nextStatus = "Ready";
    }

    const updatedCase: Case = {
      ...currentCase,
      checklist: updatedChecklist,
      status: nextStatus,
      timeline: [chkEvt, ...currentCase.timeline],
      updatedAt: timestamp
    };

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    googleSheetsService.syncChecklistItem(caseId, {
      id: itemId,
      title: checkedTitle,
      isCompleted,
      completedAt: isCompleted ? timestamp : undefined,
      completedBy: isCompleted ? currentUser.name : undefined
    });
    googleSheetsService.syncTimeline(caseId, chkEvt);

    return updatedCase;
  }

  public static addCaseAttachment(
    caseId: string,
    fileName: string,
    fileType: string,
    category: CaseAttachment["category"],
    fileData: string,
    currentUser: User
  ): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) throw new Error("Case not found");

    const currentCase = this.casesCache[caseIndex];

    // RBAC check
    if (currentUser.role !== UserRole.OWNER && !currentCase.assignedStaffIds.includes(currentUser.id)) {
      throw new Error("Access Denied");
    }

    const timestamp = new Date().toISOString();
    const newAttachment: CaseAttachment = {
      id: `att_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      fileName,
      fileType,
      category,
      fileData,
      uploadedAt: timestamp,
      uploadedBy: currentUser.name
    };

    // Auto-advance case status to Documents Pending or Ready depending on some check
    let nextStatus = currentCase.status;
    if (currentCase.status === "Draft" || currentCase.status === "Assigned") {
      nextStatus = "Documents Pending";
    }

    const docEvt: CaseTimelineEvent = {
      id: `evt_doc_${Date.now()}`,
      timestamp,
      title: "Documents Uploaded",
      details: `Document '${fileName}' [Category: ${category}] added to digital case file.`,
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    const updatedCase: Case = {
      ...currentCase,
      attachments: [...currentCase.attachments, newAttachment],
      status: nextStatus,
      timeline: [docEvt, ...currentCase.timeline],
      updatedAt: timestamp
    };

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    googleSheetsService.syncDocument(caseId, newAttachment);
    googleSheetsService.syncTimeline(caseId, docEvt);

    return updatedCase;
  }

  public static generateCaseInvoice(
    caseId: string,
    dueDate: string,
    subTotal: number,
    gstRate: number,
    currentUser: User
  ): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) throw new Error("Case not found");

    const currentCase = this.casesCache[caseIndex];

    // RBAC Check - Only Owners or authorized billing executives can invoice
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied: Only Owner can authorize invoice generation.");
    }

    const timestamp = new Date().toISOString();
    const gstAmount = parseFloat(((subTotal * gstRate) / 100).toFixed(2));
    const totalAmount = parseFloat((subTotal + gstAmount).toFixed(2));

    // Format like JNA/2026-27/0000X
    const invoiceNumStr = (this.casesCache.length + 100).toString().padStart(5, "0");
    const invoiceId = `JNA/2026-27/${invoiceNumStr}`;

    const newInvoice: CaseInvoice = {
      id: invoiceId,
      date: timestamp.split("T")[0],
      dueDate,
      subTotal,
      gstRate,
      gstAmount,
      totalAmount,
      status: "UNPAID",
      payments: []
    };

    const invEvt: CaseTimelineEvent = {
      id: `evt_inv_${Date.now()}`,
      timestamp,
      title: "Invoice Generated",
      details: `Premium luxury corporate invoice '${invoiceId}' generated. Bill Amount: INR ${totalAmount.toLocaleString("en-IN")}.`,
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    const updatedCase: Case = {
      ...currentCase,
      invoice: newInvoice,
      timeline: [invEvt, ...currentCase.timeline],
      updatedAt: timestamp
    };

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    googleSheetsService.syncTimeline(caseId, invEvt);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "INVOICE_GENERATED",
      "DATABASE",
      `Invoice '${invoiceId}' raised against Case '${caseId}' for INR ${totalAmount.toLocaleString("en-IN")}.`
    );

    return updatedCase;
  }

  public static addCasePayment(
    caseId: string,
    amount: number,
    mode: string,
    transactionRef: string,
    remarks: string,
    currentUser: User
  ): Case {
    this.init();
    const caseIndex = this.casesCache.findIndex(c => c.id === caseId);
    if (caseIndex === -1) throw new Error("Case not found");

    const currentCase = this.casesCache[caseIndex];
    if (!currentCase.invoice) {
      throw new Error("No active invoice exists for this case to process payment.");
    }

    const timestamp = new Date().toISOString();
    const receiptNum = `REC/2026-27/${(currentCase.invoice.payments.length + 1).toString().padStart(5, "0")}`;

    const newPayment: CasePayment = {
      id: receiptNum,
      date: timestamp.split("T")[0],
      amount,
      mode,
      transactionRef,
      remarks
    };

    const updatedPayments = [...currentCase.invoice.payments, newPayment];
    const totalPaid = updatedPayments.reduce((sum, p) => sum + p.amount, 0);

    let invoiceStatus: CaseInvoice["status"] = "UNPAID";
    if (totalPaid >= currentCase.invoice.totalAmount) {
      invoiceStatus = "PAID";
    }

    const updatedInvoice: CaseInvoice = {
      ...currentCase.invoice,
      status: invoiceStatus,
      payments: updatedPayments
    };

    const payEvt: CaseTimelineEvent = {
      id: `evt_pay_${Date.now()}`,
      timestamp,
      title: "Payment Received",
      details: `Payment receipt '${receiptNum}' logged via [${mode}]. Amount: INR ${amount.toLocaleString("en-IN")}. Invoice is now ${invoiceStatus}.`,
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    const updatedCase: Case = {
      ...currentCase,
      invoice: updatedInvoice,
      timeline: [payEvt, ...currentCase.timeline],
      updatedAt: timestamp
    };

    this.casesCache[caseIndex] = updatedCase;
    this.persist();

    googleSheetsService.syncTimeline(caseId, payEvt);

    // Audit Log
    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "PAYMENT_RECORDED",
      "DATABASE",
      `Payment of INR ${amount.toLocaleString("en-IN")} logged against invoice '${currentCase.invoice.id}'.`
    );

    return updatedCase;
  }
}
