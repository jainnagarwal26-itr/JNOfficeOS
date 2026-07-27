/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * JN OfficeOS Master Enterprise Metadata Registry & Data Dictionary
 * Version: 1.0.0-PRO
 * 
 * This file serves as the single source of truth for the system's software DNA.
 * Future backends, integrations, and AI modules can programmatically import and 
 * derive their behaviors from this authoritative metadata dictionary.
 */

export interface EntityMetadata {
  entityName: string;
  displayName: string;
  description: string;
  primaryKey: string;
  uniqueKeys: string[];
  foreignKeys: string[];
  repository: string;
  businessRules: string[];
  events: string[];
  permissions: string[];
  auditEnabled: boolean;
  version: string;
  ownerModule: string;
  futureAIReady: boolean;
  googleReady: boolean;
  appsScriptReady: boolean;
}

export interface RepositoryCatalog {
  repositoryName: string;
  purpose: string;
  entitiesManaged: string[];
  primaryMethods: string[];
  dependencies: string[];
  publishedEvents: string[];
  consumedEvents: string[];
  persistenceTarget: string;
  futureSyncCapability: string;
}

export interface EventMetadata {
  eventName: string;
  publisher: string;
  subscribers: string[];
  payloadSchema: string;
  businessRuleConsumers: string[];
  notificationConsumers: string[];
  auditConsumers: string[];
  futureExternalIntegration: string[];
}

export interface BusinessRuleMetadata {
  ruleName: string;
  trigger: string;
  conditions: string[];
  actions: string[];
  priority: "Low" | "Medium" | "High" | "Critical";
  isEnabled: boolean;
  affectedRepositories: string[];
  affectedEntities: string[];
}

export interface PermissionMetadata {
  permissionName: string;
  scope: string; // "View" | "Create" | "Update" | "Delete" | "Approve" | "Reject" | "Export" | "Import" | "Publish" | "Archive" | "Restore" | "Owner Override"
  roles: string[];
  entities: string[];
  repositories: string[];
  uiModule: string;
}

export interface DataDictionaryField {
  fieldName: string;
  displayName: string;
  entity: string;
  dataType: "string" | "number" | "boolean" | "date" | "json" | "array";
  required: boolean;
  defaultValue: string;
  validationRules: string[];
  allowedValues?: string[];
  lookupSource?: string;
  indexed: boolean;
  searchable: boolean;
  filterable: boolean;
  exportable: boolean;
  auditEnabled: boolean;
}

export interface RelationshipMetadata {
  fromEntity: string;
  toEntity: string;
  type: "One-to-One" | "One-to-Many" | "Many-to-One" | "Many-to-Many";
  optionality: "Required" | "Optional" | "Conditional";
  dependencyChain: string;
}

export interface GoogleSheetsPhysicalSchema {
  sheetName: string;
  purpose: string;
  columns: string[];
  primaryKey: string;
  foreignKeys: string[];
  indexes: string[];
  validationRules: string[];
  relationships: string[];
  estimatedRecordVolume: string;
  batchStrategy: "Incremental" | "Full Overwrite" | "Real-time Row Stream";
  readStrategy: "Cached Memory" | "On-Demand Query";
  writeStrategy: "Queued Back-off" | "Direct Sync";
}

export interface AppsScriptContract {
  repository: string;
  futureService: string;
  crudOperations: string[];
  queueSupport: boolean;
  retrySupport: boolean;
  conflictStrategy: "Overwrite" | "Server-Wins" | "Merge";
}

export interface NumberingRule {
  entity: string;
  prefix: string;
  suffix: string;
  financialYear: boolean;
  runningSequence: string; // e.g. "00001"
  resetRules: string;
}

export interface ReportingMetadata {
  reportName: string;
  repositories: string[];
  entities: string[];
  permissions: string[];
  exportFormats: string[];
  futureScheduler: string;
}

export interface IntegrationContract {
  channel: string;
  purpose: string;
  authMethod: string;
  payloadType: string;
  triggerEvent: string;
  futureAPI: string;
}

export interface AIRegistryMetadata {
  aiModule: string;
  accessibleEntities: string[];
  allowedRepositories: string[];
  promptContextSources: string[];
  auditRestrictions: string;
  permissionScope: string;
}

// ==========================================
// MASTER PORTED REGISTRY ARRAYS
// ==========================================

export const ENTITY_METADATA_REGISTRY: EntityMetadata[] = [
  {
    entityName: "User",
    displayName: "User Account & Role Profile",
    description: "System user profiles containing login credentials, assigned roles, and granular permission capabilities.",
    primaryKey: "id",
    uniqueKeys: ["email", "username"],
    foreignKeys: [],
    repository: "UserRepository",
    businessRules: ["Void invalid login sessions", "Track audit logs on configuration change"],
    events: ["USER_LOGIN", "USER_LOGOUT", "USER_CREATED", "USER_UPDATED"],
    permissions: ["userManagementView", "userManagementEdit"],
    auditEnabled: true,
    version: "1.0.0",
    ownerModule: "UserManagement",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Client",
    displayName: "Client CRM Profile",
    description: "KYC records, registration data, GSTIN, PAN, Bank Details, and Assigned Staff of professional practice clients.",
    primaryKey: "id",
    uniqueKeys: ["pan", "gstin"],
    foreignKeys: ["assignedStaff"],
    repository: "ClientRepository",
    businessRules: ["Auto-verify GSTIN formats", "Lock timeline alterations post completion"],
    events: ["CLIENT_CREATED", "CLIENT_UPDATED", "CLIENT_ARCHIVED"],
    permissions: ["clientCrmView", "clientCrmEdit"],
    auditEnabled: true,
    version: "1.1.0",
    ownerModule: "ClientCRM",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Service",
    displayName: "Service Catalog Item",
    description: "Definition of professional compliance services, standard pricing, government form numbers, and rules.",
    primaryKey: "id",
    uniqueKeys: ["code"],
    foreignKeys: [],
    repository: "ServiceMasterRepository",
    businessRules: ["Enforce specific checklist constraints based on compliance periods"],
    events: ["SERVICE_CREATED", "SERVICE_UPDATED", "SERVICE_ARCHIVED"],
    permissions: ["serviceMasterView", "serviceMasterEdit"],
    auditEnabled: true,
    version: "1.0.0",
    ownerModule: "ServiceMaster",
    futureAIReady: false,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Case",
    displayName: "Practice Execution Case",
    description: "The core transactional instance of a Service being delivered to a Client with a completion checklist, invoice, and milestones.",
    primaryKey: "id",
    uniqueKeys: [],
    foreignKeys: ["clientId", "serviceId", "assignedStaffIds", "workflowId"],
    repository: "CaseRepository",
    businessRules: ["Calculate case progress from checklist", "Enforce completion validation barriers"],
    events: ["CASE_CREATED", "CASE_UPDATED", "CASE_COMPLETED"],
    permissions: ["caseView", "caseCreate", "caseEdit"],
    auditEnabled: true,
    version: "1.2.0",
    ownerModule: "CaseManagement",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Invoice",
    displayName: "Tax Invoice Ledger",
    description: "Ledger containing billing details, GST breakdowns, sub-totals, and balances for compliance workflows.",
    primaryKey: "id",
    uniqueKeys: [],
    foreignKeys: ["clientId", "caseId"],
    repository: "FinancialRepository",
    businessRules: ["Enforce FY sequence reset rules", "Prevent updates once invoice state is void"],
    events: ["INVOICE_GENERATED", "INVOICE_VOIDED", "INVOICE_RECONCILED"],
    permissions: ["invoiceView", "invoiceCreate", "invoiceVoid"],
    auditEnabled: true,
    version: "1.1.0",
    ownerModule: "FinancialEngine",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Receipt",
    displayName: "Receipt Register",
    description: "Records matching funds paid by clients with respective invoices, including transaction reference details.",
    primaryKey: "receiptNumber",
    uniqueKeys: ["transactionRefNo"],
    foreignKeys: ["invoiceNumber"],
    repository: "FinancialRepository",
    businessRules: ["Auto-allocate receipts to due invoices", "Trigger event on payment completion"],
    events: ["PAYMENT_RECEIVED"],
    permissions: ["receiptView", "receiptCreate"],
    auditEnabled: true,
    version: "1.0.0",
    ownerModule: "FinancialEngine",
    futureAIReady: false,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "Expense",
    displayName: "Office Expense Sheet",
    description: "Operational cash outflow tracker documenting utility receipts, subscriptions, salaries, and office costs.",
    primaryKey: "expenseId",
    uniqueKeys: [],
    foreignKeys: [],
    repository: "ExpenseRepository",
    businessRules: ["Enforce category classification budgets"],
    events: ["EXPENSE_LOGGED"],
    permissions: ["expenseView", "expenseCreate"],
    auditEnabled: true,
    version: "1.0.0",
    ownerModule: "FinancialEngine",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  },
  {
    entityName: "SmartDocument",
    displayName: "Smart Document Registry",
    description: "File tracking metadata, document categorization, version hashes, Google Drive associations, and ocr status.",
    primaryKey: "id",
    uniqueKeys: [],
    foreignKeys: ["clientId", "caseId"],
    repository: "DocumentRepository",
    businessRules: ["Store immutable versions", "Enforce cryptographic hash integrity on check-in"],
    events: ["DOCUMENT_UPLOADED", "DOCUMENT_VERIFIED", "DOCUMENT_REJECTED"],
    permissions: ["clientCrmEdit", "userManagementEdit"],
    auditEnabled: true,
    version: "1.0.0",
    ownerModule: "SmartDmsMaster",
    futureAIReady: true,
    googleReady: true,
    appsScriptReady: true
  }
];

export const REPOSITORY_METADATA_REGISTRY: RepositoryCatalog[] = [
  {
    repositoryName: "CaseRepository",
    purpose: "Handles case lifecycles, progress track indicators, checklist completions, timelines, and case links.",
    entitiesManaged: ["Case", "CaseChecklistItem", "CaseTimelineEvent", "CaseNote"],
    primaryMethods: ["getCases()", "getCaseById()", "createCase()", "updateCase()", "addCaseNote()", "toggleChecklistItem()"],
    dependencies: ["googleSheetsService", "addAuditLog", "localStorage"],
    publishedEvents: ["CASE_CREATED", "CASE_UPDATED", "CASE_COMPLETED"],
    consumedEvents: [],
    persistenceTarget: "IndexedDB / LocalStorage / Cloud Adapter Interface",
    futureSyncCapability: "Full Bi-Directional Row Synchronization"
  },
  {
    repositoryName: "DocumentRepository",
    purpose: "Manages active and historical legal/tax files, classification headers, verification status, and versions.",
    entitiesManaged: ["SmartDocument", "DocumentVersion", "DocumentVerification", "DocumentReminder"],
    primaryMethods: ["getDocuments()", "createDocument()", "updateDocument()", "uploadNewVersion()", "verifyDocument()"],
    dependencies: ["localStorage", "addAuditLog"],
    publishedEvents: ["DOCUMENT_UPLOADED", "DOCUMENT_VERIFIED", "DOCUMENT_REJECTED"],
    consumedEvents: ["CLIENT_CREATED"],
    persistenceTarget: "Blob Store Metadata with Cloud Database Adaptability",
    futureSyncCapability: "Google Drive Resource Sync with SQL metadata pointers"
  },
  {
    repositoryName: "FinancialRepository",
    purpose: "Provides professional double-entry accounting tools for billing, invoice, receipting, and client balance allocations.",
    entitiesManaged: ["Invoice", "Receipt", "ClientLedgerEntry"],
    primaryMethods: ["getInvoices()", "generateInvoice()", "voidInvoice()", "getReceipts()", "receivePayment()"],
    dependencies: ["localStorage", "addAuditLog", "EventBus"],
    publishedEvents: ["INVOICE_GENERATED", "PAYMENT_RECEIVED", "INVOICE_VOIDED"],
    consumedEvents: ["CASE_COMPLETED"],
    persistenceTarget: "Double Ledger Encrypted Vault",
    futureSyncCapability: "Transactional accounting ledger streaming"
  },
  {
    repositoryName: "AutomationRepository",
    purpose: "Manages customized rules governing operations, system configurations, and alert execution logs.",
    entitiesManaged: ["AutomationRule", "RuleExecutionLog"],
    primaryMethods: ["getRules()", "saveRule()", "executeRules()", "logExecution()"],
    dependencies: ["localStorage", "EventBus"],
    publishedEvents: ["AUTOMATION_TRIGGERED", "RULE_EXECUTED"],
    consumedEvents: ["* (Wildcard tracking of all transaction events)"],
    persistenceTarget: "LocalStorage / Configuration Registry",
    futureSyncCapability: "Central JSON Config Sync"
  }
];

export const EVENT_METADATA_REGISTRY: EventMetadata[] = [
  {
    eventName: "CASE_CREATED",
    publisher: "CaseRepository",
    subscribers: ["NotificationRepository", "AutomationRepository", "EventRepository"],
    payloadSchema: "Case object instance summary",
    businessRuleConsumers: ["Compliance priority check rules"],
    notificationConsumers: ["Notify staff via In-App Alert"],
    auditConsumers: ["Immutable Security Log"],
    futureExternalIntegration: ["Google Calendar Event generation", "Slack/Teams notifications"]
  },
  {
    eventName: "PAYMENT_RECEIVED",
    publisher: "FinancialRepository",
    subscribers: ["CaseRepository", "NotificationRepository", "EventRepository"],
    payloadSchema: "Receipt transaction records",
    businessRuleConsumers: ["Auto-marking invoice state to PAID", "Client account credit updates"],
    notificationConsumers: ["Owner critical transaction alert"],
    auditConsumers: ["Financial Audit Trails"],
    futureExternalIntegration: ["WhatsApp Billing Receipt dispatch", "Accounting Sync webhook"]
  },
  {
    eventName: "DOCUMENT_UPLOADED",
    publisher: "DocumentRepository",
    subscribers: ["CaseRepository", "NotificationRepository", "EventRepository"],
    payloadSchema: "Document identification, size, extension details",
    businessRuleConsumers: ["Check dynamic workflow document validations"],
    notificationConsumers: ["Notify reviewer regarding document pending state"],
    auditConsumers: ["Operational verification tracking logs"],
    futureExternalIntegration: ["Trigger Google Drive API upload stream", "OCR processor webhook"]
  }
];

export const BUSINESS_RULE_METADATA_REGISTRY: BusinessRuleMetadata[] = [
  {
    ruleName: "Compliance Critical Reminder Schedule",
    trigger: "CASE_CREATED",
    conditions: ["serviceType equals GST or INCOME_TAX", "priority equals Critical"],
    actions: ["GenerateAlert for staff", "CreateReminder with 3-day due window"],
    priority: "Critical",
    isEnabled: true,
    affectedRepositories: ["ReminderRepository", "NotificationRepository"],
    affectedEntities: ["AppReminder", "AppNotification"]
  },
  {
    ruleName: "Document Verification Automatic Stage Progression",
    trigger: "DOCUMENT_VERIFIED",
    conditions: ["allRequiredDocumentsInCase equal Verified"],
    actions: ["UpdateCaseStatus to Ready to File", "CreateTimelineEntry Case status progressed"],
    priority: "High",
    isEnabled: true,
    affectedRepositories: ["CaseRepository"],
    affectedEntities: ["Case", "CaseTimelineEvent"]
  }
];

export const PERMISSION_METADATA_REGISTRY: PermissionMetadata[] = [
  {
    permissionName: "clientCrmEdit",
    scope: "Create & Update",
    roles: ["OWNER", "STAFF"],
    entities: ["Client"],
    repositories: ["ClientRepository"],
    uiModule: "ClientCRM"
  },
  {
    permissionName: "invoiceVoid",
    scope: "Delete/Void Override",
    roles: ["OWNER"],
    entities: ["Invoice"],
    repositories: ["FinancialRepository"],
    uiModule: "FinancialEngine"
  },
  {
    permissionName: "userManagementEdit",
    scope: "Master Admin override",
    roles: ["OWNER"],
    entities: ["User"],
    repositories: ["UserRepository"],
    uiModule: "UserManagement"
  }
];

export const DATA_DICTIONARY: DataDictionaryField[] = [
  {
    fieldName: "clientId",
    displayName: "Client Identifier",
    entity: "Client",
    dataType: "string",
    required: true,
    defaultValue: "CL000000",
    validationRules: ["regex(CL[0-9]{6})"],
    indexed: true,
    searchable: true,
    filterable: true,
    exportable: true,
    auditEnabled: true
  },
  {
    fieldName: "gstin",
    displayName: "Goods & Services Tax Identification Number",
    entity: "Client",
    dataType: "string",
    required: false,
    defaultValue: "",
    validationRules: ["regex([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})"],
    indexed: true,
    searchable: true,
    filterable: true,
    exportable: true,
    auditEnabled: true
  },
  {
    fieldName: "totalAmount",
    displayName: "Total Invoice Amount",
    entity: "Invoice",
    dataType: "number",
    required: true,
    defaultValue: "0",
    validationRules: ["min(0)"],
    indexed: false,
    searchable: false,
    filterable: true,
    exportable: true,
    auditEnabled: true
  }
];

export const RELATIONSHIP_REGISTRY: RelationshipMetadata[] = [
  {
    fromEntity: "Case",
    toEntity: "Client",
    type: "Many-to-One",
    optionality: "Required",
    dependencyChain: "Client must exist before Case creation"
  },
  {
    fromEntity: "Invoice",
    toEntity: "Case",
    type: "One-to-One",
    optionality: "Optional",
    dependencyChain: "Invoice is generated from complete or active Cases"
  },
  {
    fromEntity: "SmartDocument",
    toEntity: "Client",
    type: "Many-to-One",
    optionality: "Required",
    dependencyChain: "SmartDocument must always link to a verified Client ID"
  }
];

export const GOOGLE_SHEETS_BLUEPRINT: GoogleSheetsPhysicalSchema[] = [
  {
    sheetName: "jn_officeos_clients",
    purpose: "Physical worksheet backing Client CRM profile entries.",
    columns: ["ID", "Category", "Name", "TradeName", "Mobile", "Email", "PAN", "GSTIN", "Address", "BankDetailsJSON", "Status", "CreatedAt"],
    primaryKey: "ID",
    foreignKeys: [],
    indexes: ["PAN", "GSTIN"],
    validationRules: ["Name not empty", "PAN format: [A-Z]{5}[0-9]{4}[A-Z]{1}"],
    relationships: ["Linked from cases worksheet via client ID"],
    estimatedRecordVolume: "10,000 clients max",
    batchStrategy: "Incremental",
    readStrategy: "Cached Memory",
    writeStrategy: "Queued Back-off"
  },
  {
    sheetName: "jn_officeos_cases",
    purpose: "Physical ledger storing all compliance assignments and checklist parameters.",
    columns: ["ID", "ClientID", "ClientName", "AssignedStaffIDs", "ServiceID", "ServiceName", "ServiceType", "Priority", "Status", "ChecklistJSON", "ExpectedCompletionDate", "CreatedAt"],
    primaryKey: "ID",
    foreignKeys: ["ClientID", "ServiceID"],
    indexes: ["ClientID", "Status"],
    validationRules: ["Status in Enum range"],
    relationships: ["References Clients, ServiceMaster sheets"],
    estimatedRecordVolume: "50,000 cases annually",
    batchStrategy: "Real-time Row Stream",
    readStrategy: "On-Demand Query",
    writeStrategy: "Direct Sync"
  }
];

export const APPS_SCRIPT_BLUEPRINT: AppsScriptContract[] = [
  {
    repository: "CaseRepository",
    futureService: "CaseService.gs",
    crudOperations: ["insertCase", "updateCase", "deleteCase", "fetchCases"],
    queueSupport: true,
    retrySupport: true,
    conflictStrategy: "Server-Wins"
  },
  {
    repository: "FinancialRepository",
    futureService: "FinancialService.gs",
    crudOperations: ["addInvoice", "addReceipt", "fetchTransactions"],
    queueSupport: true,
    retrySupport: true,
    conflictStrategy: "Merge"
  }
];

export const NUMBERING_REGISTRY: NumberingRule[] = [
  {
    entity: "Client",
    prefix: "CLI-",
    suffix: "",
    financialYear: false,
    runningSequence: "00001",
    resetRules: "Never reset"
  },
  {
    entity: "Case",
    prefix: "CASE-",
    suffix: "",
    financialYear: true,
    runningSequence: "000001",
    resetRules: "Reset sequence dynamically every fiscal financial year"
  },
  {
    entity: "Invoice",
    prefix: "JNA/",
    suffix: "",
    financialYear: true,
    runningSequence: "00001",
    resetRules: "Reset sequence dynamically every fiscal financial year"
  }
];

export const REPORTING_METADATA_REGISTRY: ReportingMetadata[] = [
  {
    reportName: "Client Balance Outstanding Statement",
    repositories: ["FinancialRepository"],
    entities: ["Invoice", "Receipt", "Client"],
    permissions: ["reportsView"],
    exportFormats: ["PDF", "CSV"],
    futureScheduler: "Weekly email delivery system"
  }
];

export const INTEGRATION_REGISTRY: IntegrationContract[] = [
  {
    channel: "Google Sheets",
    purpose: "Real-time ledger cloud data mirror",
    authMethod: "OAuth2 Consent Flow",
    payloadType: "JSON Structured Rows",
    triggerEvent: "CRUD database transitions",
    futureAPI: "SpreadsheetApp API"
  },
  {
    channel: "Google Drive",
    purpose: "Immutable PDF backup and client attachments storage repository",
    authMethod: "OAuth2 Workspace Scopes",
    payloadType: "Binary Base64 streams",
    triggerEvent: "DOCUMENT_UPLOADED",
    futureAPI: "DriveApp API"
  }
];

export const AI_REGISTRY: AIRegistryMetadata[] = [
  {
    aiModule: "Compliance Smart Assistant",
    accessibleEntities: ["Case", "Service", "Client", "SmartDocument"],
    allowedRepositories: ["CaseRepository", "DocumentRepository"],
    promptContextSources: ["Client context checklists", "OCR parsed legal documents text", "Case timeline historical records"],
    auditRestrictions: "No password hash access permitted. All queries tracked in AuditLog",
    permissionScope: "Staff level constrained limits"
  }
];
