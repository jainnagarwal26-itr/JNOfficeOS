/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum UserRole {
  OWNER = "OWNER",
  ADMINISTRATOR = "ADMINISTRATOR",
  MANAGER = "MANAGER",
  STAFF = "STAFF",
  AUDITOR = "AUDITOR",
  READ_ONLY = "READ_ONLY"
}

export interface StaffPermissions {
  clientCrmView: boolean;
  clientCrmEdit: boolean;
  serviceMasterView: boolean;
  serviceMasterEdit: boolean;
  invoiceView: boolean;
  invoiceCreate: boolean;
  invoiceVoid: boolean;
  receiptView: boolean;
  receiptCreate: boolean;
  expenseView: boolean;
  expenseCreate: boolean;
  reportsView: boolean;
  settingsView: boolean;
  settingsEdit: boolean;
  auditLogView: boolean;
  userManagementView: boolean;
  userManagementEdit: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  permissions: StaffPermissions;
  status: "ACTIVE" | "INACTIVE" | "LOCKED" | "DISABLED";
  createdAt: string;
  username: string;
  mobile: string;
  designation: string;
  department?: string;
  departmentId?: string;
  designationId?: string;
  joiningDate: string;
  lastLogin?: {
    timestamp: string;
    ip: string;
    browser: string;
  };
  lastActivity?: string;
  modulePermissions?: Record<string, {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    print: boolean;
    export: boolean;
  }>;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  userEmail: string;
  userName: string;
  role: UserRole;
  action: string;
  details: string;
  category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM";
}

export interface BankDetails {
  bankName: string;
  accountNo: string;
  ifscCode: string;
  branchName: string;
  accountHolderName: string;
  upiId: string;
}

export interface FirmSettings {
  firmName: string;
  tagline: string;
  phone: string;
  email: string;
  address: string;
  invoicePrefix: string;
  invoiceNextNumber: number;
  bankDetails: BankDetails;
  termsAndConditions: string[];
  declaration: string;
  signatureImage: string | null; // Base64 or URL
  sessionTimeoutMinutes: number;
}

export interface TableColumnSchema {
  name: string;
  type: "string" | "number" | "boolean" | "date" | "json";
  description: string;
  required: boolean;
}

export interface TableSchema {
  tableName: string;
  description: string;
  columns: TableColumnSchema[];
}

export interface ClientTimelineEvent {
  id: string;
  timestamp: string;
  title: string;
  type: "SYSTEM" | "ACTIVITY" | "NOTE" | "DOC";
  details: string;
  userEmail: string;
  userName: string;
}

export interface ClientDocument {
  fileName: string;
  fileType: string;
  fileData: string; // base64 payload or representation
  uploadedAt: string;
  uploadedBy: string;
}

export interface ClientContact {
  id: string; // e.g. CNT000001
  clientId: string; // references Client.id
  name: string;
  role: string; // e.g. Director, Accountant, HR, Partner, Owner
  email: string;
  phone: string;
  isPrimary: boolean;
}

export interface Client {
  id: string; // e.g. CL000001
  category: "Individual" | "Proprietorship" | "Partnership" | "LLP" | "Private Limited" | "Public Limited" | "Trust" | "Society" | "NGO" | "HUF" | "Government" | "Other";
  
  // Basic Details
  name: string;
  tradeName: string;
  businessName: string;
  mobile: string;
  alternateMobile: string;
  whatsapp: string;
  email: string;
  website: string;

  // Referral / Channel
  clientSource?: "Direct" | "Indirect / Referral";
  referredBy?: string;

  // Identity Details
  pan: string;
  aadhaar: string;
  gstin: string;
  tan: string;
  udyamRegistration: string;
  fssaiNumber: string;
  iecNumber: string;
  professionalTaxNumber: string;
  pfNumber: string;
  esicNumber: string;
  cin: string;
  din: string;
  msme: string;

  // Address
  officeAddress: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;

  // Bank Details
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  upi: string;

  // Business Details
  businessNature: string;
  businessType: string;
  constitution: string;
  dateOfIncorporation: string;
  dateOfRegistration: string;
  financialYear: string;
  assessmentYear: string;

  // Status
  status: "Active" | "Inactive" | "Blacklisted" | "Closed";

  // Contacts
  contacts?: ClientContact[];

  // Tags
  tags: string[];

  // Specific Statutory Compliance Form Assignments
  itrFormType?: "ITR-1" | "ITR-2" | "ITR-3" | "ITR-4" | "ITR-5" | "ITR-6" | "ITR-7" | "NONE";
  gstSchemeType?: "GSTR1_3B_MONTHLY" | "QRMP_QUARTERLY" | "COMPOSITION_CMP08" | "GSTR4_ANNUAL" | "NONE";
  tdsFormType?: "FORM_24Q" | "FORM_26Q" | "FORM_27Q" | "FORM_27EQ" | "FORM_24Q_26Q_BOTH" | "NONE";
  taxAuditType?: "FORM_3CA_3CD" | "FORM_3CB_3CD" | "NONE";

  // Document Management
  documents: Record<string, ClientDocument>; // keys: PAN, Aadhaar, GST, Cancelled Cheque, Photo, DSC, MOA, AOA, Partnership Deed, Trust Deed, Other Documents

  // Assigned Staff (User IDs)
  assignedStaff: string[];

  // Timeline events
  timeline: ClientTimelineEvent[];

  // Internal Notes (Visible only to OWNER)
  internalNotes: string;

  createdAt: string;
  updatedAt: string;
}

export type ServiceStatus = "Active" | "Inactive" | "Archived";
export type ServicePeriod = "One Time" | "Monthly" | "Quarterly" | "Half Yearly" | "Yearly" | "Custom";

export interface ServiceRule {
  financialYearRequired: boolean;
  assessmentYearRequired: boolean;
  monthRequired: boolean;
  quarterRequired: boolean;
  governmentFormRequired: boolean;
  registrationNumberRequired: boolean;
  expiryDateRequired: boolean;
  renewalRequired: boolean;
  documentRequired: boolean;
  amountRequired: boolean;
  dueDateRequired: boolean;
}

export interface ServiceHistory {
  id: string;
  timestamp: string;
  action: "CREATED" | "MODIFIED" | "CLONED" | "DISABLED" | "ARCHIVED" | "REORDERED" | "BULK_IMPORTED";
  details: string;
  userEmail: string;
  userName: string;
}

export interface Service {
  id: string; // e.g. SRV00001
  name: string;
  category: string; // e.g. "GST", "Income Tax"
  code: string; // Unique, e.g. "GST-R1"
  description: string;
  governmentForm: string; // e.g. "GSTR-1", "ITR-1"
  department: string; // e.g. "Goods and Services Tax Department", "Income Tax Department"
  applicableTo: string[]; // List of categories (e.g. "Individual", "Private Limited")
  
  // Actions
  isNew: boolean;
  isUpdate: boolean;
  isRenewal: boolean;
  isCorrection: boolean;
  isCancellation: boolean;
  isDuplicate: boolean;
  isMigration: boolean;
  isRevision: boolean;

  // Status & Period
  status: ServiceStatus;
  period: ServicePeriod;

  // Rule Engine
  rules: ServiceRule;

  // Sorting
  orderIndex: number;

  // Audit Trails
  history: ServiceHistory[];

  createdAt: string;
  updatedAt: string;
}

export interface ServiceWorkflowTemplate {
  id: string; // e.g. WFT0001
  serviceId: string; // references Service.id
  serviceName: string;
  serviceCode: string;
  stages: string[]; // e.g. ["Client Selected", "Service Selected", "Service Rule Loaded", "Required Documents", "Verification", "Work Started", "Work In Progress", "Government Portal Filing", "Acknowledgement Received", "Completed", "Invoice Ready", "Payment Pending", "Closed"]
  requiredDocuments: string[]; // e.g. ["PAN", "Aadhaar", "GST Certificate"]
  autoDueDateDays: number; // Automation Rule: e.g. 15 days from creation
  autoStatusChange: boolean; // Automation Rule: change to "Verification Pending" when all docs uploaded
  autoInvoiceEligibility: boolean; // Automation Rule: auto-eligible on "Completed" stage
  isActive: boolean; // Disable/Enable
  isArchived: boolean; // Archive
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTask {
  id: string;
  title: string;
  assignedStaffId: string; // references User.id
  assignedStaffName: string;
  dueDate: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  status: "Pending" | "Completed" | "Cancelled";
  createdAt: string;
  completedAt?: string;
}

export interface WorkflowDocument {
  name: string; // Type of doc (e.g. PAN, Aadhaar)
  status: "Pending" | "Uploaded" | "Verified" | "Rejected";
  fileName?: string;
  fileType?: string;
  fileData?: string; // base64 representation
  uploadedAt?: string;
  uploadedBy?: string; // user email
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface WorkflowTimelineEvent {
  id: string;
  timestamp: string;
  title: string; // e.g. "Created", "Documents Uploaded"
  details: string; // e.g. "Aadhaar verified by Amit Sharma"
  userEmail: string;
  userName: string;
}

export interface WorkflowNote {
  id: string;
  type: "INTERNAL" | "OWNER" | "STAFF" | "CLIENT";
  content: string;
  authorName: string;
  authorEmail: string;
  timestamp: string;
}

export interface ActiveWorkflow {
  id: string; // e.g. WF000001
  clientId: string; // references Client.id
  clientName: string;
  serviceId: string; // references Service.id
  serviceName: string;
  serviceCode: string;
  templateId: string; // references ServiceWorkflowTemplate.id
  currentStageIndex: number;
  status: "Pending" | "Document Pending" | "Verification Pending" | "Ready to File" | "Filed" | "Acknowledgement Received" | "Completed" | "Cancelled" | "Rejected" | "On Hold";
  requiredDocuments: WorkflowDocument[];
  tasks: WorkflowTask[];
  timeline: WorkflowTimelineEvent[];
  notes: WorkflowNote[];
  assignedStaffId: string; // primary staff assigned
  assignedStaffName: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

// ====================================================
// ENTERPRISE CASE MANAGEMENT SYSTEM TYPES
// ====================================================

export type CasePriority = "Low" | "Medium" | "High" | "Critical";

export type CaseStatus = 
  | "Draft"
  | "Assigned"
  | "Documents Pending"
  | "Ready"
  | "Work Started"
  | "Under Processing"
  | "Filed"
  | "Completed"
  | "Cancelled"
  | "On Hold";

export interface CaseChecklistItem {
  id: string;
  title: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string; // staff name or email
}

export interface CaseAttachment {
  id: string;
  fileName: string;
  fileType: string;
  category: "Identity" | "Financial" | "Portal" | "Tax Document" | "Receipt" | "Acknowledgement" | "Other";
  fileData: string; // base64 representation
  uploadedAt: string;
  uploadedBy: string; // user name/email
}

export interface CasePayment {
  id: string; // REC/2026-27/00001
  date: string;
  amount: number;
  mode: string;
  transactionRef?: string;
  remarks?: string;
}

export interface CaseInvoice {
  id: string; // Sequential JNA/2026-27/00001
  date: string;
  dueDate: string;
  subTotal: number;
  gstRate: number; // e.g. 18 for 18%
  gstAmount: number;
  totalAmount: number;
  status: "UNPAID" | "PAID" | "VOID";
  payments: CasePayment[];
}

export interface CaseTimelineEvent {
  id: string;
  timestamp: string;
  title: string; // e.g., Case Created, Assigned
  details: string;
  userEmail: string;
  userName: string;
}

export interface CaseNote {
  id: string;
  type: "OWNER" | "STAFF" | "INTERNAL";
  content: string;
  authorName: string;
  authorEmail: string;
  timestamp: string;
}

export interface Case {
  id: string; // Format: CASE-2026-000001
  clientId: string;
  clientName: string;
  assignedStaffIds: string[]; // single or multiple staff User.id
  serviceId: string;
  serviceName: string;
  serviceType: string; // service category, e.g. "GST"
  priority: CasePriority;
  status: CaseStatus;
  createdAt: string;
  expectedCompletionDate: string;
  completedDate?: string;
  checklist: CaseChecklistItem[];
  attachments: CaseAttachment[];
  timeline: CaseTimelineEvent[];
  notes: CaseNote[];
  invoice?: CaseInvoice; // Invoices never exist without a Case
  workflowId?: string; // Optional linked active workflow ID
  updatedAt: string;
}

// ==========================================
// ENTERPRISE NOTIFICATION & AUTOMATION TYPES
// ==========================================

export interface AppEvent {
  id: string;
  timestamp: string;
  type: string; // e.g. CASE_CREATED, PAYMENT_RECEIVED, CLIENT_CREATED, USER_LOGIN, etc.
  source: string; // e.g. "Authentication", "Cases", "Financial Engine", etc.
  payload: any;
  userEmail?: string;
  userName?: string;
}

export type NotificationType = "Information" | "Success" | "Warning" | "Critical" | "Reminder" | "Announcement";
export type DeliveryChannel = "In-App Notification" | "Dashboard Alert" | "Owner Alert" | "Staff Alert" | "System Alert" | "Email" | "WhatsApp" | "SMS" | "Push Notification";

export interface AppNotification {
  id: string;
  timestamp: string;
  type: NotificationType;
  title: string;
  message: string;
  channel: DeliveryChannel;
  isRead: boolean;
  isArchived: boolean;
  priority: "Low" | "Medium" | "High" | "Critical";
  targetUserId?: string; // staff ID or "owner" or "all"
  metadata?: Record<string, any>;
}

export interface RuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "exists" | "not_exists" | "contains";
  value?: string;
}

export interface RuleAction {
  type: "GenerateAlert" | "UpdateLedger" | "TimelineEntry" | "CreateReminder" | "NotifyOwner" | "NotifyStaff";
  params: Record<string, any>;
}

export interface AutomationRule {
  id: string;
  name: string;
  description: string;
  triggerEvent: string; // e.g. CASE_COMPLETED, PAYMENT_RECEIVED, DOCUMENT_UPLOADED
  conditions: RuleCondition[];
  actions: RuleAction[];
  isEnabled: boolean;
  priority: "Low" | "Medium" | "High" | "Critical";
  createdAt: string;
  updatedAt: string;
}

export interface AppReminder {
  id: string;
  title: string;
  description: string;
  category: "Compliance" | "Renewals" | "Payment Due" | "Document Expiry" | "Client Follow-up" | "Owner Task" | "Staff Task";
  dueDate: string;
  status: "Pending" | "Completed" | "Overdue";
  assignedToId?: string; // user ID
  createdAt: string;
  completedAt?: string;
  clientId?: string;
  clientName?: string;
  caseId?: string;
}

export interface RuleExecutionLog {
  id: string;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  eventId: string;
  eventType: string;
  status: "Success" | "Failed" | "Skipped";
  actionsTaken: string[];
  details: string;
}

// ==========================================
// ENTERPRISE REPORTING & PDF ENGINE TYPES
// ==========================================

export type ReportType =
  | "CLIENT_DIRECTORY"
  | "CLIENT_LEDGER"
  | "OUTSTANDING_REPORT"
  | "INVOICE_REGISTER"
  | "RECEIPT_REGISTER"
  | "PAYMENT_REGISTER"
  | "EXPENSE_REGISTER"
  | "CASE_REGISTER"
  | "WORKFLOW_REPORT"
  | "TASK_REPORT"
  | "STAFF_PERFORMANCE"
  | "ATTENDANCE_READY"
  | "COMPLIANCE_SUMMARY"
  | "GST_SUMMARY"
  | "ITR_SUMMARY"
  | "TDS_SUMMARY"
  | "PF_SUMMARY"
  | "ESIC_SUMMARY"
  | "REVENUE_REPORT"
  | "PROFIT_SUMMARY"
  | "MONTHLY_SUMMARY"
  | "QUARTERLY_SUMMARY"
  | "FINANCIAL_YEAR_SUMMARY";

export type DocumentType =
  | "TAX_INVOICE"
  | "RECEIPT"
  | "PAYMENT_VOUCHER"
  | "CREDIT_NOTE"
  | "DEBIT_NOTE"
  | "QUOTATION"
  | "ESTIMATE"
  | "PROFORMA_INVOICE"
  | "CLIENT_STATEMENT"
  | "OUTSTANDING_STATEMENT"
  | "CASE_SUMMARY"
  | "WORKFLOW_SUMMARY"
  | "TASK_SUMMARY";

export interface ReportColumn {
  key: string;
  label: string;
  visible: boolean;
}

export interface ReportTemplate {
  id: string;
  reportType: ReportType;
  name: string;
  columns: ReportColumn[];
  sortBy: string;
  sortOrder: "asc" | "desc";
  groupBy?: string;
  updatedAt: string;
}

export interface ScheduledReport {
  id: string;
  name: string;
  reportType: ReportType;
  frequency: "Daily" | "Weekly" | "Monthly" | "Yearly";
  recipients: string[]; // Email addresses
  format: "PDF" | "Excel" | "CSV" | "JSON";
  isEnabled: boolean;
  lastRun?: string;
  nextRun: string;
  createdAt: string;
}

// ==========================================
// ENTERPRISE DMS PRO TYPES
// ==========================================

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  fileName: string;
  fileSize: number;
  hash: string;
  uploadedAt: string;
  uploadedBy: string;
  gdriveId?: string; // Google Drive READY
  ocrStatus: "PENDING" | "PROCESSED" | "FAILED" | "NOT_READY"; // OCR READY
  ocrText?: string;
  aiClassification?: string; // AI READY
  tags?: string[];
}

export interface DocumentVerification {
  id: string;
  documentId: string;
  status: "Pending" | "Verified" | "Rejected" | "Needs Re-upload";
  verifiedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
}

export interface DocumentReminder {
  id: string;
  documentId: string;
  title: string;
  daysRemaining: number;
  status: "Pending" | "Sent" | "Expired";
  lastSentAt?: string;
  reminderInterval: "90 Days" | "60 Days" | "30 Days" | "15 Days" | "7 Days" | "1 Day" | "Expired";
}

export interface SmartDocument {
  id: string; // DOC-YYYY-0001
  name: string;
  category: "DSC" | "Food Licence" | "GST Registration" | "IEC" | "Passport" | "Agreements" | "PAN" | "Aadhaar" | "AIS" | "Form 26AS" | "Balance Sheet" | "P&L" | "Cancelled Cheque" | "Other";
  clientId: string; // Links - Must never exist independently
  caseId?: string;
  workflowId?: string;
  invoiceId?: string;
  paymentId?: string;
  currentVersion: number;
  versions: DocumentVersion[];
  verification: DocumentVerification;
  expiryDate?: string; // Expiry Tracker
  tags: string[];
  notes?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SmartChecklist {
  id: string;
  serviceId: string;
  serviceName: string;
  mandatoryDocuments: string[];
}






