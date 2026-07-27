/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole } from "../types";
import { addAuditLog } from "./db";
import { eventBus } from "./eventBus";

// ==========================================
// ENTERPRISE CONFIGURATION STRUCTURES
// ==========================================

export interface CompanyDetails {
  companyName: string;
  legalName: string;
  gstNumber: string;
  pan: string;
  tan: string;
  iec: string;
  msmeUdyam: string;
  address: string;
  state: string;
  country: string;
  phoneNumbers: string[];
  emailIds: string[];
  website: string;
  logo: string | null;
  digitalSignature: string | null;
  seal: string | null;
  letterhead: string | null;
  invoiceFooter: string;
  termsAndConditions: string[];
  bankDetails: {
    bankName: string;
    accountNo: string;
    ifscCode: string;
    branchName: string;
    accountHolderName: string;
    upiId: string;
  };
  upiDetails: string;
  qrImage: string | null;
  defaultCurrency: string;
  financialYear: string;
}

export interface BrandingConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  sidebarStyle: "Solid" | "Glassmorphic" | "Minimal" | "Luxury";
  headerStyle: "Sticky" | "Floating" | "Minimal";
  logoPosition: "Left" | "Center" | "Hidden";
  loginScreenBranding: {
    customLogo: string | null;
    backgroundStyle: "Slate" | "Midnight" | "DarkNavy" | "EnterpriseGrad";
    welcomeText: string;
  };
  darkTheme: boolean;
  lightThemeReady: boolean;
  animationLevel: "None" | "Low" | "Full";
  borderRadius: "None" | "Small" | "Medium" | "Large";
  cardStyle: "Flat" | "Elevated" | "Glass";
}

export interface OfficeSettingsConfig {
  workingDays: string[]; // e.g., ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
  officeHours: { start: string; end: string };
  lunchBreak: { start: string; end: string };
  holidayCalendar: { id: string; date: string; name: string }[];
  weekendConfiguration: { Saturday: "Full" | "Half" | "Off"; Sunday: "Full" | "Half" | "Off" };
  sessionTimeout: number; // in minutes
  passwordPolicy: { minLength: number; requireNumbers: boolean; requireSpecials: boolean };
  autoLogout: boolean;
  fileSizeLimits: number; // in MB
  defaultTimeZone: string;
  language: string;
}

export interface RolePermissionsMatrix {
  role: string;
  pages: Record<string, boolean>; // pageId -> allowed
  actions: Record<string, boolean>; // actionId -> allowed
  repositories: Record<string, "None" | "Read" | "ReadWrite">;
  events: Record<string, "None" | "SubscribeOnly" | "PublishOnly" | "Full">;
}

export interface NumberFormatConfig {
  prefix: string;
  suffix: string;
  financialYearEnabled: boolean;
  runningNumberStart: number;
  runningNumberPadding: number;
  currentValue: number;
  resetRule: "Yearly" | "Monthly" | "Never";
}

export interface NumberingConfigs {
  client: NumberFormatConfig;
  case: NumberFormatConfig;
  invoice: NumberFormatConfig;
  receipt: NumberFormatConfig;
  voucher: NumberFormatConfig;
  quotation: NumberFormatConfig;
  document: NumberFormatConfig;
}

export interface FeatureFlag {
  id: string;
  name: string;
  isEnabled: boolean;
  status: "Enabled" | "Disabled" | "Hidden" | "Experimental";
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: string;
  size: "Small" | "Medium" | "Large";
  visible: boolean;
  x: number;
  y: number;
  roleVisibility: string[]; // e.g., ["OWNER", "STAFF"]
}

export interface DashboardConfig {
  widgets: DashboardWidget[];
  widgetOrdering: string[];
  widgetLocking: boolean;
  templates: { id: string; name: string; widgets: string[] }[];
}

export interface CalculatedColumn {
  name: string;
  formula: string; // e.g. "TotalAmount * 0.18"
}

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  repository: string; // "Clients" | "Invoices" | "Cases" | "Expenses"
  entity: string;
  columns: string[];
  calculatedColumns: CalculatedColumn[];
  grouping: string;
  sorting: { column: string; direction: "asc" | "desc" };
  filters: { column: string; operator: string; value: string }[];
  roleVisibility: string[];
  isFavorite: boolean;
}

export interface PdfTemplateConfig {
  id: string; // "invoice" | "receipt" | "quotation" | "case_summary" | "workflow_summary" | "statement"
  logoPosition: "Left" | "Right" | "Center" | "Hidden";
  showHeader: boolean;
  showFooter: boolean;
  margins: { top: number; bottom: number; left: number; right: number }; // in mm
  watermarkText: string;
  qrPosition: "TopRight" | "BottomLeft" | "BottomRight" | "Hidden";
  signaturePosition: "BottomLeft" | "BottomRight" | "Hidden";
  showPageNumbers: boolean;
}

export interface WorkflowStage {
  id: string;
  name: string;
  statusColor: string; // Hex or Tailwind color class
  approvalRequired: boolean;
  requiredDocuments: string[];
  completionRule: string;
  escalationRules: { triggerDays: number; action: string }[];
}

export interface WorkflowConfig {
  id: string;
  name: string;
  stages: WorkflowStage[];
  transitions: { from: string; to: string }[];
}

export interface VisualRuleCondition {
  field: string;
  operator: "equals" | "not_equals" | "greater_than" | "less_than" | "contains";
  value: string;
}

export interface VisualRuleAction {
  type: "NotifyOwner" | "CreateReminder" | "HighlightCase" | "Escalate" | "PinDashboard";
  params: Record<string, any>;
}

export interface VisualRule {
  id: string;
  name: string;
  triggerEvent: string;
  conditions: VisualRuleCondition[];
  actions: VisualRuleAction[];
  priority: "Low" | "Medium" | "High" | "Critical";
  isEnabled: boolean;
  scheduling?: string; // cron expression if timed
}

export interface CustomNotificationConfig {
  id: string;
  event: string;
  recipients: string[];
  channels: string[]; // e.g. ["In-App", "WhatsApp", "Email"]
  priority: "Low" | "Medium" | "High" | "Critical";
  template: string;
  soundEnabled: boolean;
  pinned: boolean;
  autoExpiryDays: number;
}

export interface ReminderConfigRule {
  id: string;
  name: string;
  category: "Compliance" | "Renewals" | "Custom";
  type: "GST" | "ITR" | "ROC" | "DSC" | "Licenses" | "Custom";
  leadDays: number;
  isRecurring: boolean;
  recurringInterval: string; // e.g., "Monthly on 15th", "Yearly"
}

export interface CustomField {
  id: string;
  entity: "Client" | "Case" | "Invoice" | "Payment" | "Document" | "Service";
  name: string;
  label: string;
  type: "Text" | "Number" | "Date" | "Dropdown" | "Checkbox" | "Multi-select";
  options: string[]; // for dropdown/multi-select
  required: boolean;
  validationRegex?: string;
  minVal?: number;
  maxVal?: number;
}

export interface SmartExpression {
  id: string;
  name: string;
  expression: string; // serialized visual statement block
  isEnabled: boolean;
}

export interface ConfigSnapshot {
  id: string;
  name: string;
  timestamp: string;
  data: string; // JSON payload of entire configurations state
}

export interface MarketplaceModule {
  name: string;
  version: string;
  dependencies: string[];
  permissions: string[];
  featureFlags: string[];
  repositoryRegistration: string[];
  navigationRegistration: string[];
}

// ==========================================
// STORAGE KEYS CONSTANTS
// ==========================================
const KEYS = {
  COMPANY: "jn_studio_company",
  BRANDING: "jn_studio_branding",
  OFFICE: "jn_studio_office",
  ROLES: "jn_studio_roles",
  NUMBERING: "jn_studio_numbering",
  FLAGS: "jn_studio_flags",
  DASHBOARDS: "jn_studio_dashboards",
  REPORTS: "jn_studio_reports",
  PDFS: "jn_studio_pdfs",
  WORKFLOWS: "jn_studio_workflows",
  RULES: "jn_studio_rules",
  NOTIFICATIONS: "jn_studio_notifications",
  REMINDERS: "jn_studio_reminders",
  CUSTOM_FIELDS: "jn_studio_custom_fields",
  EXPRESSIONS: "jn_studio_expressions",
  SNAPSHOTS: "jn_studio_snapshots"
};

// ==========================================
// 1. CONFIGURATION REPOSITORY (Company Details, Office Settings, Numbering, etc.)
// ==========================================
export class ConfigurationRepository {
  private static companyCache: CompanyDetails | null = null;
  private static officeCache: OfficeSettingsConfig | null = null;
  private static numberingCache: NumberingConfigs | null = null;
  private static customFieldsCache: CustomField[] | null = null;
  private static expressionsCache: SmartExpression[] | null = null;

  public static getCompanyDetails(): CompanyDetails {
    if (this.companyCache) {
      if (this.companyCache.bankDetails?.bankName !== "AU SMALL FINANCE BANK" || this.companyCache.gstNumber !== "") {
        this.companyCache.gstNumber = "";
        this.companyCache.bankDetails = {
          bankName: "AU SMALL FINANCE BANK",
          accountNo: "2121245232324709",
          ifscCode: "AUBL0002452",
          branchName: "Kharghar Mumbai",
          accountHolderName: "JAIN AGARWAL & CO",
          upiId: "8828147889@upi"
        };
        this.companyCache.upiDetails = "8828147889@upi";
        localStorage.setItem(KEYS.COMPANY, JSON.stringify(this.companyCache));
      }
      return this.companyCache;
    }
    const stored = localStorage.getItem(KEYS.COMPANY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.bankDetails?.bankName !== "AU SMALL FINANCE BANK" || parsed.gstNumber !== "") {
          parsed.gstNumber = "";
          parsed.bankDetails = {
            bankName: "AU SMALL FINANCE BANK",
            accountNo: "2121245232324709",
            ifscCode: "AUBL0002452",
            branchName: "Kharghar Mumbai",
            accountHolderName: "JAIN AGARWAL & CO",
            upiId: "8828147889@upi"
          };
          parsed.upiDetails = "8828147889@upi";
          localStorage.setItem(KEYS.COMPANY, JSON.stringify(parsed));
        }
        this.companyCache = parsed;
        return this.companyCache!;
      } catch (e) {
        // Fall back to defaults
      }
    }

    // Default Fallback matching existing FirmSettings but enriched for Section 1 Company Studio
    const defaults: CompanyDetails = {
      companyName: "Jain Agarwal & Co.",
      legalName: "Jain Agarwal & Co. Chartered Accountants",
      gstNumber: "",
      pan: "AABCA1234F",
      tan: "MUMA01234E",
      iec: "0102030405",
      msmeUdyam: "UDYAM-MH-19-0123456",
      address: "Shop No. A6 & 7, Shree Sai Niketan CHS Ltd, Navghar Road, Bhayander East, Thane",
      state: "Maharashtra",
      country: "India",
      phoneNumbers: ["+91 8828147889", "+91 2244668800"],
      emailIds: ["jainnagarwal90@gmail.com", "contact@jainagarwal.com"],
      website: "https://jainnagarwal.com",
      logo: null,
      digitalSignature: null,
      seal: null,
      letterhead: null,
      invoiceFooter: "Thank you for choosing Jain Agarwal & Co. for your professional advisory needs.",
      termsAndConditions: [
        "Payment due within agreed terms.",
        "Interest may apply on delayed payments where applicable.",
        "Cheques are subject to realization."
      ],
      bankDetails: {
        bankName: "AU SMALL FINANCE BANK",
        accountNo: "2121245232324709",
        ifscCode: "AUBL0002452",
        branchName: "Kharghar Mumbai",
        accountHolderName: "JAIN AGARWAL & CO",
        upiId: "8828147889@upi"
      },
      upiDetails: "8828147889@upi",
      qrImage: null,
      defaultCurrency: "INR (₹)",
      financialYear: "2026-27"
    };
    this.companyCache = defaults;
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(defaults));
    return defaults;
  }

  public static updateCompanyDetails(details: CompanyDetails, currentUser: User): CompanyDetails {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied: Only Owners can update Company details.");
    }
    this.companyCache = details;
    localStorage.setItem(KEYS.COMPANY, JSON.stringify(details));

    // Publish event
    eventBus.publish("CONFIGURATION_UPDATED", "CompanyStudio", { category: "CompanyDetails", details }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "COMPANY_STUDIO_UPDATED",
      "SETTINGS",
      "Company parameters updated in Enterprise Studio."
    );
    return details;
  }

  public static getOfficeSettings(): OfficeSettingsConfig {
    if (this.officeCache) return this.officeCache;
    const stored = localStorage.getItem(KEYS.OFFICE);
    if (stored) {
      this.officeCache = JSON.parse(stored);
      return this.officeCache!;
    }

    const defaults: OfficeSettingsConfig = {
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      officeHours: { start: "09:30", end: "18:30" },
      lunchBreak: { start: "13:30", end: "14:15" },
      holidayCalendar: [
        { id: "h1", date: "2026-08-15", name: "Independence Day" },
        { id: "h2", date: "2026-10-02", name: "Gandhi Jayanti" },
        { id: "h3", date: "2026-11-08", name: "Diwali" }
      ],
      weekendConfiguration: { Saturday: "Half", Sunday: "Off" },
      sessionTimeout: 15,
      passwordPolicy: { minLength: 8, requireNumbers: true, requireSpecials: true },
      autoLogout: true,
      fileSizeLimits: 10,
      defaultTimeZone: "IST (UTC+5:30)",
      language: "English"
    };
    this.officeCache = defaults;
    localStorage.setItem(KEYS.OFFICE, JSON.stringify(defaults));
    return defaults;
  }

  public static updateOfficeSettings(settings: OfficeSettingsConfig, currentUser: User): OfficeSettingsConfig {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    this.officeCache = settings;
    localStorage.setItem(KEYS.OFFICE, JSON.stringify(settings));

    eventBus.publish("CONFIGURATION_UPDATED", "OfficeSettings", { category: "OfficeSettings", settings }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "OFFICE_SETTINGS_UPDATED",
      "SETTINGS",
      `Office and compliance timers adjusted. Session timeout set to ${settings.sessionTimeout}m.`
    );
    return settings;
  }

  public static getNumberingFormats(): NumberingConfigs {
    if (this.numberingCache) return this.numberingCache;
    const stored = localStorage.getItem(KEYS.NUMBERING);
    if (stored) {
      this.numberingCache = JSON.parse(stored);
      return this.numberingCache!;
    }

    const defaults: NumberingConfigs = {
      client: { prefix: "CL", suffix: "", financialYearEnabled: false, runningNumberStart: 1, runningNumberPadding: 6, currentValue: 2, resetRule: "Never" },
      case: { prefix: "CASE-", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 10, resetRule: "Yearly" },
      invoice: { prefix: "JNA/", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 1, resetRule: "Yearly" },
      receipt: { prefix: "REC/", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 1, resetRule: "Yearly" },
      voucher: { prefix: "VCH-", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 1, resetRule: "Yearly" },
      quotation: { prefix: "QT-", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 1, resetRule: "Yearly" },
      document: { prefix: "DOC-", suffix: "", financialYearEnabled: true, runningNumberStart: 1, runningNumberPadding: 4, currentValue: 5, resetRule: "Yearly" }
    };
    this.numberingCache = defaults;
    localStorage.setItem(KEYS.NUMBERING, JSON.stringify(defaults));
    return defaults;
  }

  public static updateNumberingFormats(formats: NumberingConfigs, currentUser: User): NumberingConfigs {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    this.numberingCache = formats;
    localStorage.setItem(KEYS.NUMBERING, JSON.stringify(formats));

    eventBus.publish("CONFIGURATION_UPDATED", "NumberingStudio", { category: "Numbering", formats }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "NUMBERING_STUDIO_UPDATED",
      "SETTINGS",
      "Custom transaction and entity numbering structures compiled."
    );
    return formats;
  }

  public static getCustomFields(): CustomField[] {
    if (this.customFieldsCache) return this.customFieldsCache;
    const stored = localStorage.getItem(KEYS.CUSTOM_FIELDS);
    if (stored) {
      this.customFieldsCache = JSON.parse(stored);
      return this.customFieldsCache!;
    }

    const defaults: CustomField[] = [
      { id: "cf_1", entity: "Client", name: "industrySector", label: "Industry Sector", type: "Dropdown", options: ["Tech", "Real Estate", "Healthcare", "Manufacturing", "Retail", "Other"], required: false },
      { id: "cf_2", entity: "Case", name: "priorityAuditor", label: "Audit Reviewer Name", type: "Text", options: [], required: false }
    ];
    this.customFieldsCache = defaults;
    localStorage.setItem(KEYS.CUSTOM_FIELDS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveCustomField(field: CustomField, currentUser: User): CustomField[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const fields = this.getCustomFields();
    const idx = fields.findIndex(f => f.id === field.id);
    if (idx !== -1) {
      fields[idx] = field;
    } else {
      fields.push(field);
    }
    this.customFieldsCache = fields;
    localStorage.setItem(KEYS.CUSTOM_FIELDS, JSON.stringify(fields));

    eventBus.publish("CONFIGURATION_UPDATED", "CustomFields", { field }, currentUser.email, currentUser.name);

    addAuditLog(currentUser.email, currentUser.name, currentUser.role, "CUSTOM_FIELD_SAVED", "SETTINGS", `Custom field '${field.label}' saved for ${field.entity}`);
    return fields;
  }

  public static deleteCustomField(id: string, currentUser: User): CustomField[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let fields = this.getCustomFields();
    fields = fields.filter(f => f.id !== id);
    this.customFieldsCache = fields;
    localStorage.setItem(KEYS.CUSTOM_FIELDS, JSON.stringify(fields));
    eventBus.publish("CONFIGURATION_UPDATED", "CustomFields", { deletedId: id }, currentUser.email, currentUser.name);
    return fields;
  }

  public static getExpressions(): SmartExpression[] {
    if (this.expressionsCache) return this.expressionsCache;
    const stored = localStorage.getItem(KEYS.EXPRESSIONS);
    if (stored) {
      this.expressionsCache = JSON.parse(stored);
      return this.expressionsCache!;
    }

    const defaults: SmartExpression[] = [
      { id: "expr_1", name: "High Outstanding GST Alert", expression: "IF Service = GST AND Outstanding > 10000 AND Due Days < 5 THEN Notify Owner, Create Reminder", isEnabled: true }
    ];
    this.expressionsCache = defaults;
    localStorage.setItem(KEYS.EXPRESSIONS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveExpression(expr: SmartExpression, currentUser: User): SmartExpression[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const exprs = this.getExpressions();
    const idx = exprs.findIndex(e => e.id === expr.id);
    if (idx !== -1) {
      exprs[idx] = expr;
    } else {
      exprs.push(expr);
    }
    this.expressionsCache = exprs;
    localStorage.setItem(KEYS.EXPRESSIONS, JSON.stringify(exprs));
    eventBus.publish("CONFIGURATION_UPDATED", "SmartExpression", { expr }, currentUser.email, currentUser.name);
    return exprs;
  }

  public static deleteExpression(id: string, currentUser: User): SmartExpression[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let exprs = this.getExpressions();
    exprs = exprs.filter(e => e.id !== id);
    this.expressionsCache = exprs;
    localStorage.setItem(KEYS.EXPRESSIONS, JSON.stringify(exprs));
    return exprs;
  }
}

// ==========================================
// 2. BRANDING REPOSITORY
// ==========================================
export class BrandingRepository {
  private static brandingCache: BrandingConfig | null = null;

  public static getBranding(): BrandingConfig {
    if (this.brandingCache) return this.brandingCache;
    const stored = localStorage.getItem(KEYS.BRANDING);
    if (stored) {
      this.brandingCache = JSON.parse(stored);
      return this.brandingCache!;
    }

    const defaults: BrandingConfig = {
      primaryColor: "#0D2C6C", // Deep Navy
      secondaryColor: "#1E3A8A", // Indigo Navy
      accentColor: "#D4AF37", // Luxury Gold
      sidebarStyle: "Glassmorphic",
      headerStyle: "Sticky",
      logoPosition: "Left",
      loginScreenBranding: {
        customLogo: null,
        backgroundStyle: "Slate",
        welcomeText: "Welcome back to JN OfficeOS"
      },
      darkTheme: true,
      lightThemeReady: false,
      animationLevel: "Full",
      borderRadius: "Medium",
      cardStyle: "Glass"
    };
    this.brandingCache = defaults;
    localStorage.setItem(KEYS.BRANDING, JSON.stringify(defaults));
    return defaults;
  }

  public static updateBranding(branding: BrandingConfig, currentUser: User): BrandingConfig {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    this.brandingCache = branding;
    localStorage.setItem(KEYS.BRANDING, JSON.stringify(branding));

    eventBus.publish("CONFIGURATION_UPDATED", "BrandingStudio", { branding }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "BRANDING_STUDIO_UPDATED",
      "SETTINGS",
      "Brand aesthetic, border radius and visual templates reconfigured."
    );
    return branding;
  }
}

// ==========================================
// 3. FEATURE FLAG REPOSITORY
// ==========================================
export class FeatureFlagRepository {
  private static flagsCache: FeatureFlag[] | null = null;

  public static getFeatureFlags(): FeatureFlag[] {
    if (this.flagsCache) return this.flagsCache;
    const stored = localStorage.getItem(KEYS.FLAGS);
    if (stored) {
      this.flagsCache = JSON.parse(stored);
      return this.flagsCache!;
    }

    const defaults: FeatureFlag[] = [
      { id: "crm", name: "Client CRM Ledger", isEnabled: true, status: "Enabled" },
      { id: "gst", name: "Goods and Services Tax (GST)", isEnabled: true, status: "Enabled" },
      { id: "itr", name: "Income Tax (ITR)", isEnabled: true, status: "Enabled" },
      { id: "tds", name: "Tax Deducted at Source (TDS)", isEnabled: true, status: "Enabled" },
      { id: "roc", name: "Registrar of Companies (ROC)", isEnabled: true, status: "Enabled" },
      { id: "payroll", name: "Payroll Management", isEnabled: false, status: "Disabled" },
      { id: "inventory", name: "Practice Inventory", isEnabled: false, status: "Hidden" },
      { id: "reports", name: "Reporting & Profit Analytics", isEnabled: true, status: "Enabled" },
      { id: "dms", name: "Smart Document Management Pro", isEnabled: true, status: "Enabled" },
      { id: "reminders", name: "Dynamic Calendar & Reminders", isEnabled: true, status: "Enabled" },
      { id: "designer", name: "No-Code Studio Designer Panels", isEnabled: true, status: "Experimental" }
    ];
    this.flagsCache = defaults;
    localStorage.setItem(KEYS.FLAGS, JSON.stringify(defaults));
    return defaults;
  }

  public static updateFeatureFlag(id: string, updates: Partial<FeatureFlag>, currentUser: User): FeatureFlag {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    const flags = this.getFeatureFlags();
    const idx = flags.findIndex(f => f.id === id);
    if (idx === -1) throw new Error("Feature flag not found");

    flags[idx] = { ...flags[idx], ...updates };
    this.flagsCache = flags;
    localStorage.setItem(KEYS.FLAGS, JSON.stringify(flags));

    eventBus.publish("FEATURE_FLAG_CHANGED", "FeatureFlagStudio", { id, updates }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "FEATURE_FLAG_CHANGED",
      "SETTINGS",
      `Module flag for '${flags[idx].name}' configured to ${flags[idx].status}.`
    );
    return flags[idx];
  }
}

// ==========================================
// 4. REPORT DESIGNER REPOSITORY
// ==========================================
export class ReportDesignerRepository {
  private static reportsCache: ReportTemplate[] | null = null;

  public static getReports(): ReportTemplate[] {
    if (this.reportsCache) return this.reportsCache;
    const stored = localStorage.getItem(KEYS.REPORTS);
    if (stored) {
      this.reportsCache = JSON.parse(stored);
      return this.reportsCache!;
    }

    const defaults: ReportTemplate[] = [
      {
        id: "rep_1",
        name: "Outstanding Collections Report",
        description: "Evaluates pending case billings over specified monetary limits",
        repository: "Invoices",
        entity: "TaxInvoice",
        columns: ["clientId", "clientName", "invoiceNo", "amount", "balanceAmount", "status"],
        calculatedColumns: [
          { name: "taxAccrual", formula: "amount * 0.18" }
        ],
        grouping: "status",
        sorting: { column: "amount", direction: "desc" },
        filters: [
          { column: "balanceAmount", operator: "greater_than", value: "10000" }
        ],
        roleVisibility: ["OWNER", "Manager"],
        isFavorite: true
      }
    ];
    this.reportsCache = defaults;
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveReport(report: ReportTemplate, currentUser: User): ReportTemplate {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    const reports = this.getReports();
    const idx = reports.findIndex(r => r.id === report.id);
    if (idx !== -1) {
      reports[idx] = report;
    } else {
      reports.push(report);
    }
    this.reportsCache = reports;
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));

    eventBus.publish("REPORT_TEMPLATE_CREATED", "ReportDesigner", { report }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "REPORT_TEMPLATE_CREATED",
      "DATABASE",
      `Report configuration '${report.name}' saved.`
    );
    return report;
  }

  public static deleteReport(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let reports = this.getReports();
    reports = reports.filter(r => r.id !== id);
    this.reportsCache = reports;
    localStorage.setItem(KEYS.REPORTS, JSON.stringify(reports));
  }
}

// ==========================================
// 5. DASHBOARD DESIGNER REPOSITORY
// ==========================================
export class DashboardDesignerRepository {
  private static dashboardCache: DashboardConfig | null = null;

  public static getDashboardConfig(): DashboardConfig {
    if (this.dashboardCache) return this.dashboardCache;
    const stored = localStorage.getItem(KEYS.DASHBOARDS);
    if (stored) {
      this.dashboardCache = JSON.parse(stored);
      return this.dashboardCache!;
    }

    const defaults: DashboardConfig = {
      widgets: [
        { id: "w_kpi", title: "Practice Critical KPIs", type: "KPI", size: "Large", visible: true, x: 0, y: 0, roleVisibility: ["OWNER", "STAFF"] },
        { id: "w_revenue", title: "Monthly Revenue Flow", type: "Chart", size: "Medium", visible: true, x: 1, y: 0, roleVisibility: ["OWNER"] },
        { id: "w_cases", title: "Active Compliance Cases", type: "List", size: "Medium", visible: true, x: 2, y: 0, roleVisibility: ["OWNER", "STAFF"] },
        { id: "w_alerts", title: "Audit Queue & Alerts", type: "Alerts", size: "Small", visible: true, x: 0, y: 1, roleVisibility: ["OWNER"] }
      ],
      widgetOrdering: ["w_kpi", "w_revenue", "w_cases", "w_alerts"],
      widgetLocking: false,
      templates: [
        { id: "tpl_owner", name: "Default Owner View", widgets: ["w_kpi", "w_revenue", "w_alerts"] },
        { id: "tpl_staff", name: "Default Staff View", widgets: ["w_kpi", "w_cases"] }
      ]
    };
    this.dashboardCache = defaults;
    localStorage.setItem(KEYS.DASHBOARDS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveDashboardConfig(config: DashboardConfig, currentUser: User): DashboardConfig {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    this.dashboardCache = config;
    localStorage.setItem(KEYS.DASHBOARDS, JSON.stringify(config));

    eventBus.publish("CONFIGURATION_UPDATED", "DashboardDesigner", { config }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "DASHBOARD_DESIGNER_SAVED",
      "SETTINGS",
      "Visual widget configuration saved for dashboards."
    );
    return config;
  }
}

// ==========================================
// 6. WORKFLOW DESIGNER REPOSITORY
// ==========================================
export class WorkflowDesignerRepository {
  private static workflowsCache: WorkflowConfig[] | null = null;

  public static getWorkflows(): WorkflowConfig[] {
    if (this.workflowsCache) return this.workflowsCache;
    const stored = localStorage.getItem(KEYS.WORKFLOWS);
    if (stored) {
      this.workflowsCache = JSON.parse(stored);
      return this.workflowsCache!;
    }

    const defaults: WorkflowConfig[] = [
      {
        id: "wf_gst",
        name: "Standard GST Compliance Workflow",
        stages: [
          { id: "s1", name: "Data Collection", statusColor: "blue", approvalRequired: false, requiredDocuments: ["PAN", "BankStatement"], completionRule: "docs_uploaded", escalationRules: [] },
          { id: "s2", name: "Filing Draft", statusColor: "purple", approvalRequired: true, requiredDocuments: [], completionRule: "owner_sign_off", escalationRules: [{ triggerDays: 5, action: "Notify Owner" }] },
          { id: "s3", name: "Submitted", statusColor: "green", approvalRequired: false, requiredDocuments: ["Acknowledgement"], completionRule: "file_attached", escalationRules: [] }
        ],
        transitions: [
          { from: "s1", to: "s2" },
          { from: "s2", to: "s3" }
        ]
      }
    ];
    this.workflowsCache = defaults;
    localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveWorkflow(workflow: WorkflowConfig, currentUser: User): WorkflowConfig {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    const workflows = this.getWorkflows();
    const idx = workflows.findIndex(w => w.id === workflow.id);
    if (idx !== -1) {
      workflows[idx] = workflow;
    } else {
      workflows.push(workflow);
    }
    this.workflowsCache = workflows;
    localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows));

    eventBus.publish("WORKFLOW_UPDATED", "WorkflowDesigner", { workflow }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "WORKFLOW_UPDATED",
      "SETTINGS",
      `Workflow template '${workflow.name}' configured.`
    );
    return workflow;
  }

  public static deleteWorkflow(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let workflows = this.getWorkflows();
    workflows = workflows.filter(w => w.id !== id);
    this.workflowsCache = workflows;
    localStorage.setItem(KEYS.WORKFLOWS, JSON.stringify(workflows));
  }
}

// ==========================================
// 7. BUSINESS RULE DESIGNER REPOSITORY
// ==========================================
export class BusinessRuleDesignerRepository {
  private static rulesCache: VisualRule[] | null = null;

  public static getRules(): VisualRule[] {
    if (this.rulesCache) return this.rulesCache;
    const stored = localStorage.getItem(KEYS.RULES);
    if (stored) {
      this.rulesCache = JSON.parse(stored);
      return this.rulesCache!;
    }

    const defaults: VisualRule[] = [
      {
        id: "rule_high_balance",
        name: "High Outstanding Audit Action",
        triggerEvent: "INVOICE_GENERATED",
        conditions: [
          { field: "balanceAmount", operator: "greater_than", value: "50000" }
        ],
        actions: [
          { type: "NotifyOwner", params: { title: "Significant Bill Generated", message: "Client invoice balance is flagged" } },
          { type: "CreateReminder", params: { title: "Debt Follow Up", description: "Collect invoice dues within 5 business days" } }
        ],
        priority: "High",
        isEnabled: true
      }
    ];
    this.rulesCache = defaults;
    localStorage.setItem(KEYS.RULES, JSON.stringify(defaults));
    return defaults;
  }

  public static saveRule(rule: VisualRule, currentUser: User): VisualRule {
    if (currentUser.role !== UserRole.OWNER) {
      throw new Error("Access Denied");
    }
    const rules = this.getRules();
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx !== -1) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    this.rulesCache = rules;
    localStorage.setItem(KEYS.RULES, JSON.stringify(rules));

    eventBus.publish("RULE_UPDATED", "BusinessRuleDesigner", { rule }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "RULE_UPDATED",
      "SETTINGS",
      `Visual automation rule '${rule.name}' updated.`
    );
    return rule;
  }

  public static deleteRule(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let rules = this.getRules();
    rules = rules.filter(r => r.id !== id);
    this.rulesCache = rules;
    localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
  }
}

// ==========================================
// 8. NOTIFICATION DESIGNER REPOSITORY
// ==========================================
export class NotificationDesignerRepository {
  private static notifsCache: CustomNotificationConfig[] | null = null;

  public static getNotifications(): CustomNotificationConfig[] {
    if (this.notifsCache) return this.notifsCache;
    const stored = localStorage.getItem(KEYS.NOTIFICATIONS);
    if (stored) {
      this.notifsCache = JSON.parse(stored);
      return this.notifsCache!;
    }

    const defaults: CustomNotificationConfig[] = [
      {
        id: "notif_payment",
        event: "PAYMENT_RECEIVED",
        recipients: ["OWNER", "ASSIGNED_STAFF"],
        channels: ["In-App", "WhatsApp"],
        priority: "High",
        template: "Dear ${clientName}, payment of ₹${amount} has been securely logged on our client ledger. Thank you.",
        soundEnabled: true,
        pinned: true,
        autoExpiryDays: 7
      }
    ];
    this.notifsCache = defaults;
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveNotification(notif: CustomNotificationConfig, currentUser: User): CustomNotificationConfig {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const list = this.getNotifications();
    const idx = list.findIndex(n => n.id === notif.id);
    if (idx !== -1) {
      list[idx] = notif;
    } else {
      list.push(notif);
    }
    this.notifsCache = list;
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
    return notif;
  }

  public static deleteNotification(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let list = this.getNotifications();
    list = list.filter(n => n.id !== id);
    this.notifsCache = list;
    localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(list));
  }
}

// ==========================================
// 9. REMINDER DESIGNER REPOSITORY
// ==========================================
export class ReminderDesignerRepository {
  private static remindersCache: ReminderConfigRule[] | null = null;

  public static getReminderRules(): ReminderConfigRule[] {
    if (this.remindersCache) return this.remindersCache;
    const stored = localStorage.getItem(KEYS.REMINDERS);
    if (stored) {
      this.remindersCache = JSON.parse(stored);
      return this.remindersCache!;
    }

    const defaults: ReminderConfigRule[] = [
      { id: "rem_gst", name: "GST GSTR-1 Deadline Alert", category: "Compliance", type: "GST", leadDays: 5, isRecurring: true, recurringInterval: "Monthly on 11th" },
      { id: "rem_itr", name: "Annual Income Tax Return", category: "Compliance", type: "ITR", leadDays: 15, isRecurring: true, recurringInterval: "Yearly on July 31st" }
    ];
    this.remindersCache = defaults;
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveReminderRule(rule: ReminderConfigRule, currentUser: User): ReminderConfigRule {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const list = this.getReminderRules();
    const idx = list.findIndex(r => r.id === rule.id);
    if (idx !== -1) {
      list[idx] = rule;
    } else {
      list.push(rule);
    }
    this.remindersCache = list;
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(list));
    return rule;
  }

  public static deleteReminderRule(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let list = this.getReminderRules();
    list = list.filter(r => r.id !== id);
    this.remindersCache = list;
    localStorage.setItem(KEYS.REMINDERS, JSON.stringify(list));
  }
}

// ==========================================
// 10. TEMPLATE DESIGNER REPOSITORY
// ==========================================
export class TemplateDesignerRepository {
  private static templatesCache: PdfTemplateConfig[] | null = null;

  public static getTemplates(): PdfTemplateConfig[] {
    if (this.templatesCache) return this.templatesCache;
    const stored = localStorage.getItem(KEYS.PDFS);
    if (stored) {
      this.templatesCache = JSON.parse(stored);
      return this.templatesCache!;
    }

    const defaults: PdfTemplateConfig[] = [
      { id: "invoice", logoPosition: "Left", showHeader: true, showFooter: true, margins: { top: 15, bottom: 15, left: 10, right: 10 }, watermarkText: "JAIN AGARWAL & CO.", qrPosition: "BottomRight", signaturePosition: "BottomRight", showPageNumbers: true },
      { id: "receipt", logoPosition: "Left", showHeader: true, showFooter: true, margins: { top: 15, bottom: 15, left: 10, right: 10 }, watermarkText: "OFFICIAL RECEIPT", qrPosition: "BottomLeft", signaturePosition: "BottomRight", showPageNumbers: false }
    ];
    this.templatesCache = defaults;
    localStorage.setItem(KEYS.PDFS, JSON.stringify(defaults));
    return defaults;
  }

  public static saveTemplate(template: PdfTemplateConfig, currentUser: User): PdfTemplateConfig {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const list = this.getTemplates();
    const idx = list.findIndex(t => t.id === template.id);
    if (idx !== -1) {
      list[idx] = template;
    } else {
      list.push(template);
    }
    this.templatesCache = list;
    localStorage.setItem(KEYS.PDFS, JSON.stringify(list));
    return template;
  }
}

// ==========================================
// 11. CONFIGURATION SNAPSHOT REPOSITORY
// ==========================================
export class SnapshotRepository {
  private static snapshotsCache: ConfigSnapshot[] | null = null;

  public static getSnapshots(): ConfigSnapshot[] {
    if (this.snapshotsCache) return this.snapshotsCache;
    const stored = localStorage.getItem(KEYS.SNAPSHOTS);
    if (stored) {
      this.snapshotsCache = JSON.parse(stored);
      return this.snapshotsCache!;
    }
    this.snapshotsCache = [];
    return [];
  }

  public static createSnapshot(name: string, currentUser: User): ConfigSnapshot {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const snapshots = this.getSnapshots();

    // Pull current values
    const snapshotData = {
      company: localStorage.getItem(KEYS.COMPANY),
      branding: localStorage.getItem(KEYS.BRANDING),
      office: localStorage.getItem(KEYS.OFFICE),
      numbering: localStorage.getItem(KEYS.NUMBERING),
      flags: localStorage.getItem(KEYS.FLAGS),
      dashboards: localStorage.getItem(KEYS.DASHBOARDS),
      reports: localStorage.getItem(KEYS.REPORTS),
      workflows: localStorage.getItem(KEYS.WORKFLOWS),
      rules: localStorage.getItem(KEYS.RULES),
      notifications: localStorage.getItem(KEYS.NOTIFICATIONS),
      reminders: localStorage.getItem(KEYS.REMINDERS),
      customFields: localStorage.getItem(KEYS.CUSTOM_FIELDS),
      expressions: localStorage.getItem(KEYS.EXPRESSIONS)
    };

    const newSnapshot: ConfigSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      name,
      timestamp: new Date().toISOString(),
      data: JSON.stringify(snapshotData)
    };

    snapshots.unshift(newSnapshot);
    this.snapshotsCache = snapshots;
    localStorage.setItem(KEYS.SNAPSHOTS, JSON.stringify(snapshots));

    eventBus.publish("SNAPSHOT_CREATED", "SnapshotManager", { id: newSnapshot.id, name }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "SNAPSHOT_CREATED",
      "SECURITY",
      `Enterprise configuration snapshot '${name}' created.`
    );
    return newSnapshot;
  }

  public static restoreSnapshot(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const snapshots = this.getSnapshots();
    const snap = snapshots.find(s => s.id === id);
    if (!snap) throw new Error("Snapshot not found");

    const parsed = JSON.parse(snap.data);
    Object.entries(parsed).forEach(([keySuffix, strVal]) => {
      const storageKey = KEYS[keySuffix.toUpperCase() as keyof typeof KEYS];
      if (storageKey && strVal) {
        localStorage.setItem(storageKey, strVal as string);
      }
    });

    eventBus.publish("SNAPSHOT_RESTORED", "SnapshotManager", { id }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "SNAPSHOT_RESTORED",
      "SECURITY",
      `Enterprise configuration restored from snapshot: '${snap.name}'.`
    );
  }

  public static deleteSnapshot(id: string, currentUser: User): void {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let snapshots = this.getSnapshots();
    snapshots = snapshots.filter(s => s.id !== id);
    this.snapshotsCache = snapshots;
    localStorage.setItem(KEYS.SNAPSHOTS, JSON.stringify(snapshots));
  }

  public static compareSnapshots(id1: string, id2: string): Record<string, { changed: boolean; detail: string }> {
    const snapshots = this.getSnapshots();
    const s1 = snapshots.find(s => s.id === id1);
    const s2 = snapshots.find(s => s.id === id2);
    if (!s1 || !s2) throw new Error("One or both snapshots do not exist");

    const d1 = JSON.parse(s1.data);
    const d2 = JSON.parse(s2.data);

    const diff: Record<string, { changed: boolean; detail: string }> = {};
    const keysToCheck = Object.keys(KEYS);
    keysToCheck.forEach(key => {
      const dataKey = key.toLowerCase();
      if (dataKey === "snapshots") return;
      const str1 = d1[dataKey] || "";
      const str2 = d2[dataKey] || "";
      const changed = str1 !== str2;
      diff[key] = {
        changed,
        detail: changed ? `Difference found in configuration module data structure.` : `Identical state`
      };
    });

    return diff;
  }
}

// ==========================================
// 12. ROLE & PERMISSION REPOSITORY
// ==========================================
export class RolePermissionRepository {
  private static roleCache: RolePermissionsMatrix[] | null = null;

  public static getRoles(): RolePermissionsMatrix[] {
    if (this.roleCache) return this.roleCache;
    const stored = localStorage.getItem(KEYS.ROLES);
    if (stored) {
      this.roleCache = JSON.parse(stored);
      return this.roleCache!;
    }

    const defaults: RolePermissionsMatrix[] = [
      {
        role: "OWNER",
        pages: { crm: true, billing: true, settings: true, audit: true, reports: true, dms: true },
        actions: { deleteClients: true, voidInvoices: true, exportData: true, createUsers: true },
        repositories: { Configuration: "ReadWrite", Case: "ReadWrite", Financial: "ReadWrite" },
        events: { "*": "Full" }
      },
      {
        role: "Manager",
        pages: { crm: true, billing: true, settings: true, audit: false, reports: true, dms: true },
        actions: { deleteClients: false, voidInvoices: true, exportData: true, createUsers: false },
        repositories: { Configuration: "Read", Case: "ReadWrite", Financial: "ReadWrite" },
        events: { "*": "Full" }
      },
      {
        role: "Senior Executive",
        pages: { crm: true, billing: true, settings: false, audit: false, reports: false, dms: true },
        actions: { deleteClients: false, voidInvoices: false, exportData: false, createUsers: false },
        repositories: { Configuration: "None", Case: "ReadWrite", Financial: "Read" },
        events: { "*": "SubscribeOnly" }
      },
      {
        role: "Executive",
        pages: { crm: true, billing: false, settings: false, audit: false, reports: false, dms: true },
        actions: { deleteClients: false, voidInvoices: false, exportData: false, createUsers: false },
        repositories: { Configuration: "None", Case: "Read", Financial: "None" },
        events: { "*": "SubscribeOnly" }
      },
      {
        role: "Intern",
        pages: { crm: true, billing: false, settings: false, audit: false, reports: false, dms: true },
        actions: { deleteClients: false, voidInvoices: false, exportData: false, createUsers: false },
        repositories: { Configuration: "None", Case: "Read", Financial: "None" },
        events: { "*": "None" }
      }
    ];
    this.roleCache = defaults;
    localStorage.setItem(KEYS.ROLES, JSON.stringify(defaults));
    return defaults;
  }

  public static saveRoleMatrix(matrix: RolePermissionsMatrix, currentUser: User): RolePermissionsMatrix[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    const list = this.getRoles();
    const idx = list.findIndex(r => r.role === matrix.role);
    if (idx !== -1) {
      list[idx] = matrix;
    } else {
      list.push(matrix);
    }
    this.roleCache = list;
    localStorage.setItem(KEYS.ROLES, JSON.stringify(list));

    eventBus.publish("CONFIGURATION_UPDATED", "RoleStudio", { matrix }, currentUser.email, currentUser.name);

    addAuditLog(
      currentUser.email,
      currentUser.name,
      currentUser.role,
      "ROLE_MATRIX_UPDATED",
      "SECURITY",
      `Role matrix for '${matrix.role}' updated in Security Studio.`
    );
    return list;
  }

  public static deleteRole(role: string, currentUser: User): RolePermissionsMatrix[] {
    if (currentUser.role !== UserRole.OWNER) throw new Error("Access Denied");
    let list = this.getRoles();
    list = list.filter(r => r.role !== role);
    this.roleCache = list;
    localStorage.setItem(KEYS.ROLES, JSON.stringify(list));
    return list;
  }
}

// ==========================================
// 13. MARKETPLACE CATALOG FOUNDATION
// ==========================================
export const MARKETPLACE_CATALOG: MarketplaceModule[] = [
  {
    name: "Automated OCR Extraction Hook",
    version: "1.2.0",
    dependencies: ["Smart Document Management Pro"],
    permissions: ["documentUpload", "ocrRead"],
    featureFlags: ["dms_ocr_enabled"],
    repositoryRegistration: ["DocumentRepository"],
    navigationRegistration: ["Smart DMS > OCR Settings"]
  },
  {
    name: "Google Sheets Cloud Mirror",
    version: "2.0.4",
    dependencies: ["Client CRM Ledger", "Billing & Financials"],
    permissions: ["settingsEdit", "syncSheets"],
    featureFlags: ["sheets_sync_live"],
    repositoryRegistration: ["ConfigurationRepository"],
    navigationRegistration: ["Settings > Cloud Sync"]
  },
  {
    name: "AI-Powered Advisory Panel",
    version: "0.9.1-beta",
    dependencies: ["Reporting & Profit Analytics"],
    permissions: ["reportsView", "aiAdvisory"],
    featureFlags: ["ai_intelligence_analytics"],
    repositoryRegistration: ["ReportDesignerRepository"],
    navigationRegistration: ["Dashboard > AI Insights"]
  }
];
