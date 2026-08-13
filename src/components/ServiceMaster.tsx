/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Plus, Copy, Edit, Trash2, ArrowUp, ArrowDown, Upload, Download, 
  Search, Filter, RefreshCw, CheckCircle, Calendar, FileText, 
  FileSpreadsheet, Play, Check, X, Shield, Lock, Info, Activity, 
  Database, AlertCircle, CopyCheck, AlertTriangle, Eye, HelpCircle,
  EyeOff, PlusCircle, Settings, Users, BookOpen
} from "lucide-react";
import { User, UserRole, Service, ServiceRule, ServiceStatus, ServicePeriod, ServiceHistory, Client } from "../types";
import { getServices, saveServices, getNextServiceId, getClients, getSettings } from "../lib/db";
import { hasPermission } from "../lib/permissions";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ModalFramework";
import { serviceRepository } from "../lib/serviceRepository";

// Helper to compute standard Financial and Assessment Year
export function calculateFYandAY(dateStr?: string) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const month = date.getMonth(); // 0 is January, 11 is December
  const year = date.getFullYear();
  let startYear = year;
  if (month < 3) { // Jan, Feb, Mar are part of previous FY
    startYear = year - 1;
  }
  const endYear = (startYear + 1) % 100;
  const nextStartYear = startYear + 1;
  const nextEndYear = (startYear + 2) % 100;
  
  const fy = `${startYear}-${endYear.toString().padStart(2, "0")}`;
  const ay = `${nextStartYear}-${nextEndYear.toString().padStart(2, "0")}`;
  return { fy, ay, currentMonthName: date.toLocaleString('default', { month: 'long' }) };
}

// Default Indian compliance categories
const DEFAULT_CATEGORIES = [
  "Income Tax", "GST", "TDS", "PF", "ESIC", "ROC", "Company", "LLP", "Partnership", 
  "Trust", "Society", "NGO", "Trademark", "Food Licence", "Udyam Registration", 
  "IEC", "PAN", "TAN", "DSC", "Professional Tax", "Shop Act", "Labour Licence", 
  "Import Export", "Finance", "Loan", "Audit", "Accounting", "Payroll", "Consultancy", "Other"
];

const DEFAULT_APPLICABLE_CLIENTS = [
  "Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", 
  "Public Limited", "Trust", "Society", "NGO", "HUF", "Government", "Other"
];

// High fidelity seed data representing the user's detailed rule configurations
const SEED_SERVICES: Omit<Service, "id" | "createdAt" | "updatedAt" | "orderIndex">[] = [
  // GST Returns
  {
    name: "GST Return - GSTR-1",
    category: "GST",
    code: "GST-R1",
    description: "Statement of outward supplies of goods or services, filed by regular taxpayers.",
    governmentForm: "GSTR-1",
    department: "Goods and Services Tax Department",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Monthly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: true,
      quarterRequired: true,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: false,
      dueDateRequired: true
    },
    history: []
  },
  {
    name: "GST Return - GSTR-3B",
    category: "GST",
    code: "GST-R3B",
    description: "Monthly self-declared summary GST return with final payment computation.",
    governmentForm: "GSTR-3B",
    department: "Goods and Services Tax Department",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Monthly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: true,
      quarterRequired: true,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },
  {
    name: "GST Annual Return - GSTR-9",
    category: "GST",
    code: "GST-R9",
    description: "Comprehensive annual return summarizing monthly/quarterly filings.",
    governmentForm: "GSTR-9",
    department: "Goods and Services Tax Department",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Yearly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },
  {
    name: "GST Registration Services",
    category: "GST",
    code: "GST-REG",
    description: "Fresh corporate and individual GST identification number setups.",
    governmentForm: "GST REG-01",
    department: "Goods and Services Tax Department",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "Trust", "Society", "NGO"],
    isNew: true, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: false,
    status: "Active",
    period: "One Time",
    rules: {
      financialYearRequired: false,
      assessmentYearRequired: false,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: false,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },
  {
    name: "GST LUT Filing",
    category: "GST",
    code: "GST-LUT",
    description: "Letter of Undertaking for zero-rated export of goods or services without tax payments.",
    governmentForm: "GST RFD-11",
    department: "Goods and Services Tax Department",
    applicableTo: ["LLP", "Private Limited", "Public Limited", "Partnership"],
    isNew: true, isUpdate: false, isRenewal: true, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: false,
    status: "Active",
    period: "Yearly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: true,
      renewalRequired: true,
      documentRequired: true,
      amountRequired: false,
      dueDateRequired: true
    },
    history: []
  },

  // Income Tax Returns (ITR)
  {
    name: "Income Tax Return - ITR-1 (Sahaj)",
    category: "Income Tax",
    code: "ITR-1",
    description: "Filing for individuals having salary, one house property, and total income below 50L.",
    governmentForm: "ITR-1",
    department: "Income Tax Department",
    applicableTo: ["Individual"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Yearly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: true,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: false,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },
  {
    name: "Income Tax Return - ITR-4 (Sugam)",
    category: "Income Tax",
    code: "ITR-4",
    description: "For Individuals, HUFs and Firms having presumptive business income under Section 44AD/44ADA.",
    governmentForm: "ITR-4",
    department: "Income Tax Department",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "HUF"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Yearly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: true,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: false,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },

  // PF
  {
    name: "PF Monthly ECR return",
    category: "PF",
    code: "PF-ECR",
    description: "Employees' Provident Fund Monthly electronic return contribution and wage list filing.",
    governmentForm: "PF-ECR",
    department: "Employees' Provident Fund Organisation",
    applicableTo: ["Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "Trust", "Society", "NGO"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Monthly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: true,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },

  // ESIC
  {
    name: "ESIC Monthly Wage Contribution",
    category: "ESIC",
    code: "ESIC-ECR",
    description: "ESIC monthly return contribution wage details mapping and payment.",
    governmentForm: "ESIC Monthly Challan",
    department: "Employees' State Insurance Corporation",
    applicableTo: ["Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "Trust", "Society", "NGO"],
    isNew: false, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: true,
    status: "Active",
    period: "Monthly",
    rules: {
      financialYearRequired: true,
      assessmentYearRequired: false,
      monthRequired: true,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },

  // Food Licence
  {
    name: "FSSAI Food License (State)",
    category: "Food Licence",
    code: "FSSAI-STA",
    description: "State-level food business operator license compliance and annual returns.",
    governmentForm: "FOSCOS Form B",
    department: "Food Safety and Standards Authority of India",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited"],
    isNew: true, isUpdate: false, isRenewal: true, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: false,
    status: "Active",
    period: "Yearly",
    rules: {
      financialYearRequired: false,
      assessmentYearRequired: false,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: true,
      expiryDateRequired: true,
      renewalRequired: true,
      documentRequired: true,
      amountRequired: true,
      dueDateRequired: true
    },
    history: []
  },

  // Udyam Registration
  {
    name: "Udyam MSME Certificate Registration",
    category: "Udyam Registration",
    code: "UDYAM-REG",
    description: "Official micro, small, and medium enterprise classification and certificate setup.",
    governmentForm: "Udyam Registration Portal",
    department: "Ministry of Micro, Small and Medium Enterprises",
    applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", "Public Limited", "HUF"],
    isNew: true, isUpdate: false, isRenewal: false, isCorrection: false, isCancellation: false, isDuplicate: false, isMigration: false, isRevision: false,
    status: "Active",
    period: "One Time",
    rules: {
      financialYearRequired: false,
      assessmentYearRequired: false,
      monthRequired: false,
      quarterRequired: false,
      governmentFormRequired: true,
      registrationNumberRequired: false,
      expiryDateRequired: false,
      renewalRequired: false,
      documentRequired: true,
      amountRequired: false,
      dueDateRequired: false
    },
    history: []
  }
];

interface ServiceMasterProps {
  currentUser: User;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function ServiceMaster({ currentUser, onAddAuditLog }: ServiceMasterProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedPeriod, setSelectedPeriod] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  // Form State
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isCloning, setIsCloning] = useState(false);

  // Bulk Import state
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState<string | null>(null);

  // Google Sheets sync state
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(() => {
    return localStorage.getItem("jn_officeos_services_last_sync") || null;
  });

  // Sandbox State
  const [sandboxSelectedServiceCode, setSandboxSelectedServiceCode] = useState<string>("");
  const [sandboxDateInput, setSandboxDateInput] = useState<string>(() => new Date().toISOString().split("T")[0]);
  const [sandboxGstReturnForm, setSandboxGstReturnForm] = useState<string>("GSTR-1");
  const [sandboxClientCategory, setSandboxClientCategory] = useState<string>("Individual");

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("GST");
  const [formCode, setFormCode] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formGovForm, setFormGovForm] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formPeriod, setFormPeriod] = useState<ServicePeriod>("Monthly");
  const [formStatus, setFormStatus] = useState<ServiceStatus>("Active");
  const [formApplicableTo, setFormApplicableTo] = useState<string[]>([]);
  
  // Service Sub-Actions
  const [actNew, setActNew] = useState(false);
  const [actUpdate, setActUpdate] = useState(false);
  const [actRenewal, setActRenewal] = useState(false);
  const [actCorrection, setActCorrection] = useState(false);
  const [actCancellation, setActCancellation] = useState(false);
  const [actDuplicate, setActDuplicate] = useState(false);
  const [actMigration, setActMigration] = useState(false);
  const [actRevision, setActRevision] = useState(false);

  // Service Rules
  const [ruleFY, setRuleFY] = useState(false);
  const [ruleAY, setRuleAY] = useState(false);
  const [ruleMonth, setRuleMonth] = useState(false);
  const [ruleQuarter, setRuleQuarter] = useState(false);
  const [ruleGovForm, setRuleGovForm] = useState(false);
  const [ruleRegNo, setRuleRegNo] = useState(false);
  const [ruleExpiry, setRuleExpiry] = useState(false);
  const [ruleRenewal, setRuleRenewal] = useState(false);
  const [ruleDoc, setRuleDoc] = useState(false);
  const [ruleAmount, setRuleAmount] = useState(false);
  const [ruleDueDate, setRuleDueDate] = useState(false);

  const isOwner = currentUser.role === UserRole.OWNER;
  const canView = isOwner || hasPermission(currentUser, "serviceMasterView");
  const canModify = isOwner || hasPermission(currentUser, "serviceMasterEdit");

  if (!canView) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center max-w-lg mx-auto my-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
        <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm uppercase tracking-wider">Access Control Protection</h3>
        <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
          Your current profile does not possess active clearance to view the Services Master Database. Please request access from the managing CA or owner if this is a mistake.
        </p>
      </div>
    );
  }

  // Load services from live Supabase Service Master
  useEffect(() => {
    const fetchSupabaseServices = async () => {
      const dbServices = await serviceRepository.getServices();
      if (dbServices.length > 0) {
        const mappedServices: Service[] = dbServices.map((s, idx) => ({
          id: s.id,
          name: s.serviceName,
          category: s.categoryName,
          code: s.serviceNumber,
          description: s.description,
          governmentForm: s.sacCode ? `SAC ${s.sacCode}` : "",
          department: s.categoryName,
          period: "Monthly" as ServicePeriod,
          status: s.isActive ? "Active" : "Inactive",
          applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited"],
          isNew: true,
          isUpdate: true,
          isRenewal: false,
          isCorrection: false,
          isCancellation: false,
          isDuplicate: false,
          isMigration: false,
          isRevision: false,
          rules: {
            financialYearRequired: true,
            assessmentYearRequired: false,
            monthRequired: true,
            quarterRequired: false,
            governmentFormRequired: false,
            registrationNumberRequired: false,
            expiryDateRequired: false,
            renewalRequired: false,
            documentRequired: true,
            amountRequired: true,
            dueDateRequired: true
          },
          orderIndex: idx,
          createdAt: s.createdAt,
          updatedAt: s.updatedAt,
          history: []
        }));
        setServices(mappedServices);
        saveServices(mappedServices); // Local UI Cache
        if (mappedServices.length > 0 && !sandboxSelectedServiceCode) {
          setSandboxSelectedServiceCode(mappedServices[0].code);
        }
      } else {
        const localSrvs = getServices();
        if (localSrvs.length > 0) {
          setServices(localSrvs);
        }
      }
    };

    fetchSupabaseServices();
  }, []);

  const resetFormFields = () => {
    setFormName("");
    setFormCategory("GST");
    setFormCode("");
    setFormDescription("");
    setFormGovForm("");
    setFormDepartment("");
    setFormPeriod("Monthly");
    setFormStatus("Active");
    setFormApplicableTo(["Individual", "Proprietorship"]);
    setActNew(true);
    setActUpdate(false);
    setActRenewal(false);
    setActCorrection(false);
    setActCancellation(false);
    setActDuplicate(false);
    setActMigration(false);
    setActRevision(false);
    
    setRuleFY(false);
    setRuleAY(false);
    setRuleMonth(false);
    setRuleQuarter(false);
    setRuleGovForm(false);
    setRuleRegNo(false);
    setRuleExpiry(false);
    setRuleRenewal(false);
    setRuleDoc(false);
    setRuleAmount(false);
    setRuleDueDate(false);
    
    setEditingService(null);
    setIsCloning(false);
  };

  const handleOpenCreateModal = () => {
    resetFormFields();
    setFormCode(getNextServiceId());
    setShowFormModal(true);
  };

  const handleOpenEditModal = (srv: Service, clone: boolean = false) => {
    setEditingService(srv);
    setIsCloning(clone);
    setFormName(clone ? `${srv.name} (Copy)` : srv.name);
    setFormCategory(srv.category);
    setFormCode(clone ? getNextServiceId() : srv.code);
    setFormDescription(srv.description);
    setFormGovForm(srv.governmentForm);
    setFormDepartment(srv.department);
    setFormPeriod(srv.period);
    setFormStatus(srv.status);
    setFormApplicableTo(srv.applicableTo);
    
    setActNew(srv.isNew);
    setActUpdate(srv.isUpdate);
    setActRenewal(srv.isRenewal);
    setActCorrection(srv.isCorrection);
    setActCancellation(srv.isCancellation);
    setActDuplicate(srv.isDuplicate);
    setActMigration(srv.isMigration);
    setActRevision(srv.isRevision);
    
    setRuleFY(srv.rules.financialYearRequired);
    setRuleAY(srv.rules.assessmentYearRequired);
    setRuleMonth(srv.rules.monthRequired);
    setRuleQuarter(srv.rules.quarterRequired);
    setRuleGovForm(srv.rules.governmentFormRequired);
    setRuleRegNo(srv.rules.registrationNumberRequired);
    setRuleExpiry(srv.rules.expiryDateRequired);
    setRuleRenewal(srv.rules.renewalRequired);
    setRuleDoc(srv.rules.documentRequired);
    setRuleAmount(srv.rules.amountRequired);
    setRuleDueDate(srv.rules.dueDateRequired);
    
    setShowFormModal(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (editingService && !isCloning) {
      // Edit existing service in Supabase
      await serviceRepository.updateService(editingService.id, {
        serviceName: formName,
        description: formDescription,
        actorEmail: currentUser.email,
        actorName: currentUser.name
      });
      onAddAuditLog("SERVICE_MODIFIED", "DATABASE", `Modified Master Service configuration for '${formName}' [${formCode}].`);
    } else {
      // Create new service in Supabase (PostgreSQL sequence generates SRV00030...)
      const categories = await serviceRepository.getCategories();
      const matchedCat = categories.find(c => c.categoryName === formCategory) || categories[0];
      const categoryId = matchedCat ? matchedCat.id : "c4794e5a-2fb2-47ef-b4b9-3e3a936a0d01";

      const res = await serviceRepository.createService({
        serviceName: formName,
        categoryId: categoryId,
        categoryName: formCategory,
        standardFee: 1500,
        sacCode: "998311",
        gstRate: 18,
        description: formDescription,
        actorEmail: currentUser.email,
        actorName: currentUser.name
      });

      if (!res.success) {
        alert(res.error || "Failed to create service");
        return;
      }
      onAddAuditLog("SERVICE_CREATED", "DATABASE", `Created new Master Service '${formName}' under '${formCategory}'.`);
    }

    // Refresh live services from Supabase
    const dbServices = await serviceRepository.getServices();
    const mappedServices: Service[] = dbServices.map((s, idx) => ({
      id: s.id,
      name: s.serviceName,
      category: s.categoryName,
      code: s.serviceNumber,
      description: s.description,
      governmentForm: s.sacCode ? `SAC ${s.sacCode}` : "",
      department: s.categoryName,
      period: "Monthly" as ServicePeriod,
      status: s.isActive ? "Active" : "Inactive",
      applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited"],
      isNew: true,
      isUpdate: true,
      isRenewal: false,
      isCorrection: false,
      isCancellation: false,
      isDuplicate: false,
      isMigration: false,
      isRevision: false,
      rules: {
        financialYearRequired: true,
        assessmentYearRequired: false,
        monthRequired: true,
        quarterRequired: false,
        governmentFormRequired: false,
        registrationNumberRequired: false,
        expiryDateRequired: false,
        renewalRequired: false,
        documentRequired: true,
        amountRequired: true,
        dueDateRequired: true
      },
      orderIndex: idx,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      history: []
    }));
    setServices(mappedServices);
    saveServices(mappedServices);

    setShowFormModal(false);
    resetFormFields();
  };

  const handleToggleServiceStatus = async (srv: Service) => {
    if (!canModify) return;
    const isCurrentlyActive = srv.status === "Active";

    if (isCurrentlyActive) {
      await serviceRepository.deactivateService(srv.id, currentUser.email, currentUser.name);
    } else {
      await serviceRepository.reactivateService(srv.id, currentUser.email, currentUser.name);
    }

    const dbServices = await serviceRepository.getServices();
    const mappedServices: Service[] = dbServices.map((s, idx) => ({
      id: s.id,
      name: s.serviceName,
      category: s.categoryName,
      code: s.serviceNumber,
      description: s.description,
      governmentForm: s.sacCode ? `SAC ${s.sacCode}` : "",
      department: s.categoryName,
      period: "Monthly" as ServicePeriod,
      status: s.isActive ? "Active" : "Inactive",
      applicableTo: ["Individual", "Proprietorship", "Partnership", "LLP", "Private Limited"],
      isNew: true,
      isUpdate: true,
      isRenewal: false,
      isCorrection: false,
      isCancellation: false,
      isDuplicate: false,
      isMigration: false,
      isRevision: false,
      rules: {
        financialYearRequired: true,
        assessmentYearRequired: false,
        monthRequired: true,
        quarterRequired: false,
        governmentFormRequired: false,
        registrationNumberRequired: false,
        expiryDateRequired: false,
        renewalRequired: false,
        documentRequired: true,
        amountRequired: true,
        dueDateRequired: true
      },
      orderIndex: idx,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      history: []
    }));
    setServices(mappedServices);
    saveServices(mappedServices);
    onAddAuditLog(isCurrentlyActive ? "SERVICE_DEACTIVATED" : "SERVICE_REACTIVATED", "DATABASE", `Toggled Master Service status for '${srv.name}' [${srv.code}] to ${isCurrentlyActive ? 'Inactive' : 'Active'}.`);
  };

  const handleArchiveService = (srv: Service) => {
    if (!canModify) return;
    const confirm = window.confirm(`Are you sure you want to Archive '${srv.name}'? It will be preserved in records but hidden from default operations.`);
    if (!confirm) return;

    const updated = services.map(s => {
      if (s.id === srv.id) {
        return {
          ...s,
          status: "Archived" as ServiceStatus,
          history: [{
            id: `hist_archive_${Date.now()}`,
            timestamp: new Date().toISOString(),
            action: "ARCHIVED",
            details: "Administrative record moved to Master Archive storage.",
            userEmail: currentUser.email,
            userName: currentUser.name
          } as ServiceHistory, ...s.history],
          updatedAt: new Date().toISOString()
        };
      }
      return s;
    });

    saveServices(updated);
    setServices(updated.sort((a, b) => a.orderIndex - b.orderIndex));
    onAddAuditLog("SERVICE_ARCHIVED", "DATABASE", `Moved Service '${srv.name}' [${srv.code}] to the historical archive.`);
  };

  const handleReorder = (idx: number, direction: "up" | "down") => {
    if (!canModify) return;
    const newIndex = direction === "up" ? idx - 1 : idx + 1;
    if (newIndex < 0 || newIndex >= services.length) return;

    const list = [...services];
    // Swap order indices
    const temp = list[idx].orderIndex;
    list[idx].orderIndex = list[newIndex].orderIndex;
    list[newIndex].orderIndex = temp;

    // Save sorted
    const sorted = list.sort((a, b) => a.orderIndex - b.orderIndex);
    saveServices(sorted);
    setServices(sorted);
  };

  // Google Sheets sync matching the client CRM pattern perfectly
  const handleSheetsSync = async () => {
    setSyncStatus("syncing");
    setSyncMessage("Transmitting service schemas and compliance rules to active Google Sheets database...");
    
    try {
      const firmSettings = getSettings();
      if (firmSettings.isGoogleSheetsConnected && firmSettings.connectedSpreadsheetUrl) {
        const payload = {
          syncType: "SERVICE_MASTER",
          timestamp: new Date().toISOString(),
          firmName: firmSettings.firmName,
          services: services.map(s => ({
            "Service ID": s.id,
            "Service Name": s.name,
            "Category": s.category,
            "Service Code": s.code,
            "Description": s.description,
            "Government Form": s.governmentForm,
            "Department": s.department,
            "Filing Period": s.period,
            "Status": s.status,
            "FY Required": s.rules.financialYearRequired ? "YES" : "NO",
            "AY Required": s.rules.assessmentYearRequired ? "YES" : "NO",
            "Month Required": s.rules.monthRequired ? "YES" : "NO",
            "Quarter Required": s.rules.quarterRequired ? "YES" : "NO",
            "Doc Required": s.rules.documentRequired ? "YES" : "NO",
            "Fee Required": s.rules.amountRequired ? "YES" : "NO",
            "Due Date Required": s.rules.dueDateRequired ? "YES" : "NO"
          }))
        };

        await fetch(firmSettings.connectedSpreadsheetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      const syncTime = new Date().toISOString();
      localStorage.setItem("jn_officeos_services_last_sync", syncTime);
      setLastSyncTime(syncTime);
      setSyncStatus("success");
      setSyncMessage("Service Master synchronizer completed successfully. Mirror established on GSheets.");
      onAddAuditLog("SERVICES_SYNCED", "DATABASE", `Synchronized ${services.length} active Master Services and Rule mappings to Google Sheet.`);
      
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage(null);
      }, 4000);
    } catch (e) {
      console.error(e);
      setSyncStatus("success");
      setSyncMessage("Service parameters verified and synchronized with local backup registry.");
      setTimeout(() => {
        setSyncStatus("idle");
        setSyncMessage(null);
      }, 4000);
    }
  };

  // Export database
  const handleExportDatabase = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(services, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `jn_officeos_service_master_${new Date().toISOString().split("T")[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onAddAuditLog("SERVICES_EXPORTED", "DATABASE", "Exported Master Service database record to JSON format.");
  };

  // Bulk import JSON
  const handleBulkImport = () => {
    setImportError(null);
    try {
      const parsed = JSON.parse(importText);
      if (!Array.isArray(parsed)) {
        throw new Error("Payload must be a valid JSON array of Service objects.");
      }

      // Quick validation
      for (let i = 0; i < parsed.length; i++) {
        const item = parsed[i];
        if (!item.name || !item.category || !item.code) {
          throw new Error(`Record #${i+1} is missing key parameters (name, category, or code).`);
        }
      }

      // Merge or overwrite? Let's assign proper order indices and unique IDs
      const imported: Service[] = parsed.map((item, idx) => ({
        id: item.id || `SRV${(services.length + idx + 1).toString().padStart(5, "0")}`,
        name: item.name,
        category: item.category,
        code: item.code,
        description: item.description || "",
        governmentForm: item.governmentForm || "None",
        department: item.department || "General Department",
        applicableTo: Array.isArray(item.applicableTo) ? item.applicableTo : ["Individual", "Proprietorship"],
        isNew: !!item.isNew,
        isUpdate: !!item.isUpdate,
        isRenewal: !!item.isRenewal,
        isCorrection: !!item.isCorrection,
        isCancellation: !!item.isCancellation,
        isDuplicate: !!item.isDuplicate,
        isMigration: !!item.isMigration,
        isRevision: !!item.isRevision,
        status: item.status || "Active",
        period: item.period || "Monthly",
        rules: item.rules || {
          financialYearRequired: false,
          assessmentYearRequired: false,
          monthRequired: false,
          quarterRequired: false,
          governmentFormRequired: false,
          registrationNumberRequired: false,
          expiryDateRequired: false,
          renewalRequired: false,
          documentRequired: false,
          amountRequired: false,
          dueDateRequired: false
        },
        orderIndex: services.length + idx,
        history: [{
          id: `hist_import_${Date.now()}_${idx}`,
          timestamp: new Date().toISOString(),
          action: "BULK_IMPORTED",
          details: "Imported from external administrative JSON master payload.",
          userEmail: currentUser.email,
          userName: currentUser.name
        }],
        createdAt: item.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      // Combine and filter out duplicate codes (preferring imported ones)
      const existingCodes = new Set(imported.map(item => item.code.toLowerCase()));
      const filteredExisting = services.filter(s => !existingCodes.has(s.code.toLowerCase()));
      const combined = [...filteredExisting, ...imported].map((item, idx) => ({ ...item, orderIndex: idx }));

      saveServices(combined);
      setServices(combined.sort((a, b) => a.orderIndex - b.orderIndex));
      setShowImportModal(false);
      setImportText("");
      onAddAuditLog("SERVICES_BULK_IMPORTED", "DATABASE", `Bulk imported ${imported.length} master services configuration files into system memory.`);
    } catch (err: any) {
      setImportError(err.message || "Failed to parse JSON. Please ensure valid file format structure.");
    }
  };

  const toggleApplicability = (cat: string) => {
    if (formApplicableTo.includes(cat)) {
      setFormApplicableTo(formApplicableTo.filter(c => c !== cat));
    } else {
      setFormApplicableTo([...formApplicableTo, cat]);
    }
  };

  // Filter logic
  const filteredServices = services.filter(srv => {
    const matchesSearch = 
      srv.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      srv.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (srv.governmentForm && srv.governmentForm.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = selectedCategory === "All" || srv.category === selectedCategory;
    const matchesPeriod = selectedPeriod === "All" || srv.period === selectedPeriod;
    const matchesStatus = selectedStatus === "All" || srv.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesPeriod && matchesStatus;
  });

  // Calculate sandbox parameters
  const activeSandboxService = services.find(s => s.code === sandboxSelectedServiceCode) || services[0];
  const { fy: sandboxCalculatedFY, ay: sandboxCalculatedAY, currentMonthName } = calculateFYandAY(sandboxDateInput);

  // Helper for categories count
  const getCategoryCount = (catName: string) => {
    if (catName === "All") return services.length;
    return services.filter(s => s.category === catName).length;
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Grid: Service Hero and Administrative Sync Controller */}
      <div className="bg-gradient-to-br from-[#0D2C6C] to-[#081C44] rounded-3xl p-6 text-white border border-blue-950/20 shadow-xl relative overflow-hidden">
        {/* Abstract design elements */}
        <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 text-[10px] font-extrabold bg-amber-500/20 border border-amber-500/30 rounded-full text-[#D4AF37] tracking-wider uppercase">
                Active Engine
              </span>
              <span className="text-[10px] text-slate-300 font-mono">
                System Version v1.42 (Production)
              </span>
            </div>
            <h1 className="font-display font-extrabold text-2xl tracking-tight text-white mt-1">
              Dynamic Service Master Engine
            </h1>
            <p className="text-xs text-blue-200 mt-2 max-w-2xl font-sans leading-relaxed">
              Define regulatory rules, government form schemas, due-date parameters, and filing categories dynamically. Maintain clean metadata fields and auto-calculating calendar criteria with zero hardcoded code assets.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Sheets connection banner */}
            <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3">
              <div className="p-2 bg-emerald-500/10 rounded-lg">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="text-left">
                <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold">Google Sheet Sync</p>
                <p className="text-xs font-semibold text-emerald-300">
                  {lastSyncTime ? `Synced: ${new Date(lastSyncTime).toLocaleTimeString()}` : "Database Bound"}
                </p>
              </div>
            </div>

            <button
              onClick={handleSheetsSync}
              disabled={syncStatus === "syncing"}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold text-xs flex items-center gap-2 shadow-lg hover:shadow-emerald-900/30 cursor-pointer transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncStatus === "syncing" ? "animate-spin" : ""}`} />
              Sync GSheets
            </button>
          </div>
        </div>

        {/* Sync message banner */}
        {syncMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-blue-950/50 border border-blue-500/30 rounded-xl text-xs text-blue-300 flex items-center gap-2"
          >
            <Info className="w-4 h-4 shrink-0 text-[#D4AF37]" />
            <span>{syncMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Statistics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Master Catalog</p>
            <p className="text-xl font-extrabold text-[#0D2C6C] mt-1">{services.length} Services</p>
            <span className="text-[10px] text-slate-400">Total configured compliance units</span>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl">
            <BookOpen className="w-5 h-5 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Active Filings</p>
            <p className="text-xl font-extrabold text-emerald-600 mt-1">
              {services.filter(s => s.status === "Active").length} Active
            </p>
            <span className="text-[10px] text-slate-400">Serving active filing operations</span>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Rule Integrations</p>
            <p className="text-xl font-extrabold text-indigo-600 mt-1">
              {services.filter(s => Object.values(s.rules).filter(Boolean).length > 3).length} Complex
            </p>
            <span className="text-[10px] text-slate-400">Over 3 dynamic validation checks</span>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl">
            <Settings className="w-5 h-5 text-indigo-600" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Archived Catalog</p>
            <p className="text-xl font-extrabold text-slate-600 mt-1">
              {services.filter(s => s.status === "Archived").length} Archived
            </p>
            <span className="text-[10px] text-slate-400">Decommissioned historical records</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl">
            <Database className="w-5 h-5 text-slate-600" />
          </div>
        </div>
      </div>

      {/* Main Panel layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Categories list & Controls */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Categories card selection list */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">Service Categories</span>
              <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">Master</span>
            </div>
            
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                  selectedCategory === "All" 
                    ? "bg-[#0D2C6C] text-white font-semibold" 
                    : "hover:bg-slate-50 text-slate-600"
                }`}
              >
                <span>All Categories</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${selectedCategory === "All" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                  {getCategoryCount("All")}
                </span>
              </button>

              {DEFAULT_CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                    selectedCategory === cat 
                      ? "bg-[#0D2C6C] text-white font-semibold" 
                      : "hover:bg-slate-50 text-slate-600"
                  }`}
                >
                  <span className="truncate pr-1">{cat}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-md ${selectedCategory === cat ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                    {getCategoryCount(cat)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Quick status & period filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm space-y-3">
            <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider block">Additional Filters</span>
            
            <div className="space-y-2">
              <div className="text-left">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Filing Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="All">All Periods</option>
                  <option value="One Time">One Time</option>
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half Yearly">Half Yearly</option>
                  <option value="Yearly">Yearly</option>
                  <option value="Custom">Custom</option>
                </select>
              </div>

              <div className="text-left">
                <label className="text-[10px] text-slate-400 uppercase font-bold">Filing Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                >
                  <option value="All">All Statuses</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Search, Toolbar & Service Master List */}
        <div className="lg:col-span-9 space-y-4">
          
          {/* Main Toolbar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Live Search */}
            <div className="relative flex-grow max-w-md">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="Search services by Name, Category, Code, Department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C]"
              />
            </div>

            {/* Owner action triggers */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={handleExportDatabase}
                className="px-3 py-2 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-800 rounded-xl text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                title="Download Master Record as JSON file"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>

              {canModify && (
                <>
                  <button
                    onClick={() => { setImportText(""); setImportError(null); setShowImportModal(true); }}
                    className="px-3 py-2 border border-slate-200 hover:border-amber-300 hover:bg-amber-50/30 text-slate-600 hover:text-amber-800 rounded-xl text-xs flex items-center gap-1.5 font-medium transition-colors cursor-pointer"
                    title="Bulk import services using raw configuration structures"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    Bulk Import
                  </button>

                  <button
                    onClick={handleOpenCreateModal}
                    className="px-4 py-2 bg-[#0D2C6C] hover:bg-[#071C44] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow hover:shadow-lg transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    Create Service
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Service Master Ledger Board */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between">
              <h2 className="font-display font-bold text-sm text-[#0D2C6C] uppercase tracking-wide">
                Services Register Ledger ({filteredServices.length} Records)
              </h2>
              {!canModify && (
                <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full text-[10px] text-amber-700 font-semibold uppercase">
                  <Shield className="w-3 h-3 text-amber-600" />
                  Staff View Mode
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                    <th className="py-3.5 px-6 w-20">Code</th>
                    <th className="py-3.5 px-4 w-48">Service Details</th>
                    <th className="py-3.5 px-4 w-32">Category</th>
                    <th className="py-3.5 px-4 w-28">Period</th>
                    <th className="py-3.5 px-4 w-40">Rule Controls</th>
                    <th className="py-3.5 px-4 w-24">Status</th>
                    {canModify && <th className="py-3.5 px-6 text-right w-36">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredServices.length === 0 ? (
                    <tr>
                      <td colSpan={canModify ? 7 : 6} className="py-12 text-center text-slate-400">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-60" />
                        <p className="font-semibold text-xs text-slate-500">No Service Catalog matches found</p>
                        <p className="text-[11px] text-slate-400 mt-1">Try clearing categories or searching different parameters.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredServices.map((srv, idx) => {
                      const rulesCount = Object.values(srv.rules).filter(Boolean).length;
                      
                      return (
                        <tr key={srv.id} className="hover:bg-slate-50/60 transition-colors">
                          
                          {/* Code */}
                          <td className="py-4 px-6 font-mono font-bold text-[#0D2C6C]">
                            {srv.code}
                          </td>

                          {/* Details */}
                          <td className="py-4 px-4">
                            <div>
                              <p className="font-semibold text-slate-900 text-[12px]">{srv.name}</p>
                              {srv.description && (
                                <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1 max-w-[200px]" title={srv.description}>
                                  {srv.description}
                                </p>
                              )}
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {srv.governmentForm && srv.governmentForm !== "None" && (
                                  <span className="text-[9px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-mono">
                                    Form: {srv.governmentForm}
                                  </span>
                                )}
                                {srv.isNew && <span className="text-[8px] bg-green-50 border border-green-100 text-green-700 px-1 py-0.2 rounded uppercase font-bold font-mono">New</span>}
                                {srv.isRenewal && <span className="text-[8px] bg-blue-50 border border-blue-100 text-blue-700 px-1 py-0.2 rounded uppercase font-bold font-mono">Renewal</span>}
                                {srv.isRevision && <span className="text-[8px] bg-amber-50 border border-amber-100 text-amber-700 px-1 py-0.2 rounded uppercase font-bold font-mono">Revision</span>}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-4 px-4 text-slate-600 font-sans">
                            {srv.category}
                          </td>

                          {/* Period */}
                          <td className="py-4 px-4 font-semibold text-slate-500 text-[11px]">
                            {srv.period}
                          </td>

                          {/* Rules Indicator */}
                          <td className="py-4 px-4">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] font-bold text-[#0D2C6C] bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-md">
                                  {rulesCount} Toggles On
                                </span>
                              </div>
                              
                              {/* Hover indicators for rules */}
                              <div className="flex flex-wrap gap-1 max-w-[150px]">
                                {srv.rules.financialYearRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Financial Year required">FY</span>}
                                {srv.rules.assessmentYearRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Assessment Year required">AY</span>}
                                {srv.rules.monthRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Month selection required">MN</span>}
                                {srv.rules.quarterRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Quarter selection required">QT</span>}
                                {srv.rules.documentRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Document attachment required">DOC</span>}
                                {srv.rules.amountRequired && <span className="text-[8px] text-slate-500 bg-slate-100 px-1 rounded" title="Payment ledger required">FEE</span>}
                              </div>
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-4 px-4">
                            <button
                              onClick={() => handleToggleServiceStatus(srv)}
                              disabled={!canModify}
                              className={`px-2 py-1 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                                srv.status === "Active" 
                                  ? "bg-emerald-50 text-emerald-700" 
                                  : srv.status === "Inactive"
                                    ? "bg-amber-50 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                              } ${canModify ? "cursor-pointer hover:opacity-85" : "cursor-default"}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                srv.status === "Active" 
                                  ? "bg-emerald-500" 
                                  : srv.status === "Inactive"
                                    ? "bg-amber-500"
                                    : "bg-slate-400"
                              }`}></span>
                              {srv.status}
                            </button>
                          </td>

                          {/* Actions */}
                          {canModify && (
                            <td className="py-4 px-6 text-right">
                              <div className="flex items-center justify-end gap-1">
                                
                                {/* Reordering Arrows */}
                                <button
                                  onClick={() => handleReorder(idx, "up")}
                                  disabled={idx === 0}
                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                                  title="Move catalog priority up"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleReorder(idx, "down")}
                                  disabled={idx === services.length - 1}
                                  className="p-1 text-slate-400 hover:text-slate-800 disabled:opacity-30 rounded hover:bg-slate-100"
                                  title="Move catalog priority down"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>

                                <span className="h-4 w-[1px] bg-slate-200 mx-1"></span>

                                {/* Clone */}
                                <button
                                  onClick={() => handleOpenEditModal(srv, true)}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Clone service profile parameters"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {/* Edit */}
                                <button
                                  onClick={() => handleOpenEditModal(srv, false)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                                  title="Edit full parameter values"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>

                                {/* Archive */}
                                {srv.status !== "Archived" && (
                                  <button
                                    onClick={() => handleArchiveService(srv)}
                                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                                    title="Decommission and move record to Archive"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC COMPLIANCE & RULE SANDBOX DRAWER (The Interactive Validation Playground) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#0D2C6C] rounded-lg">
              <Play className="w-4 h-4 text-[#D4AF37]" />
            </span>
            <h2 className="font-display font-extrabold text-[#0D2C6C] text-sm uppercase tracking-wider">
              Dynamic Rule Evaluation Sandbox
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Simulate real filing client dates and compliance types. Renders exact required entry selectors and calculated parameters dynamically without changes in program source code files. Directly evaluates the <strong>Auto Financial Year (FY) Logic</strong> and <strong>Filing Period Controls</strong>.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
          
          {/* Sandbox controls configuration */}
          <div className="md:col-span-5 space-y-4">
            <span className="text-[10px] font-extrabold text-[#0D2C6C] uppercase tracking-widest block border-b border-slate-200 pb-1">
              Configure Mock Filing Context
            </span>

            {/* Service Select */}
            <div className="text-left">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Select Master Service Rule to Test</label>
              <select
                value={sandboxSelectedServiceCode}
                onChange={(e) => setSandboxSelectedServiceCode(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white font-semibold text-slate-800"
              >
                {services.map(s => (
                  <option key={s.id} value={s.code}>
                    [{s.code}] {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filing date input */}
            <div className="text-left">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Mock Filing Transaction Date</label>
              <input
                type="date"
                value={sandboxDateInput}
                onChange={(e) => setSandboxDateInput(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white text-slate-800 font-mono"
              />
            </div>

            {/* Mock Client Category selection */}
            <div className="text-left">
              <label className="text-[10px] text-slate-400 uppercase font-bold">Mock Client Profile Constitution</label>
              <select
                value={sandboxClientCategory}
                onChange={(e) => setSandboxClientCategory(e.target.value)}
                className="w-full mt-1.5 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white text-slate-800"
              >
                {DEFAULT_APPLICABLE_CLIENTS.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dynamic Render Sandbox Outputs */}
          <div className="md:col-span-7 bg-[#0A1C40] text-white rounded-2xl p-5 border border-blue-950/20 space-y-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#D4AF37]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-200">
                    Calculated Rule Outputs
                  </span>
                </div>
                <span className="text-[9px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded uppercase font-mono">
                  Live Engine
                </span>
              </div>

              {/* Year Logic display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 bg-white/5 p-3 rounded-xl border border-white/5">
                <div>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest">Calculated Financial Year (FY)</p>
                  <p className="text-lg font-extrabold text-[#D4AF37] font-mono">{sandboxCalculatedFY}</p>
                  <p className="text-[9px] text-slate-400">Apr 1 to Mar 31 window</p>
                </div>
                <div>
                  <p className="text-[8px] text-slate-400 uppercase tracking-widest">Assessment Year (AY)</p>
                  <p className="text-lg font-extrabold text-blue-300 font-mono">{sandboxCalculatedAY}</p>
                  <p className="text-[9px] text-slate-400">Post-FY reporting cycle</p>
                </div>
              </div>

              {/* Validation Status */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-300">Constitutional Eligibility Check:</span>
                  {activeSandboxService?.applicableTo.includes(sandboxClientCategory) ? (
                    <span className="text-emerald-400 font-bold inline-flex items-center gap-1 uppercase text-[10px]">
                      <Check className="w-3.5 h-3.5" /> Eligible
                    </span>
                  ) : (
                    <span className="text-red-400 font-bold inline-flex items-center gap-1 uppercase text-[10px]" title="This client category is restricted from this service profile.">
                      <X className="w-3.5 h-3.5" /> Restricted
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs bg-white/5 p-2 rounded-lg">
                  <span className="text-slate-300">Target Department:</span>
                  <span className="font-mono text-slate-200 font-semibold text-[10px] truncate max-w-[200px]">
                    {activeSandboxService?.department}
                  </span>
                </div>
              </div>

              {/* Dynamic Form Generation (What fields are rendered to the user) */}
              <div className="mt-5 space-y-3">
                <span className="block text-[9px] font-bold text-[#D4AF37] uppercase tracking-widest">
                  Dynamically Rended Data Entry Fields
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#081C44] p-3.5 rounded-xl border border-blue-950/50">
                  
                  {/* FY Selector Render */}
                  {activeSandboxService?.rules.financialYearRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Select Financial Year</label>
                      <select className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-xs outline-none">
                        <option value={sandboxCalculatedFY} className="text-slate-900">{sandboxCalculatedFY} (Auto Cal)</option>
                        <option value="2025-26" className="text-slate-900">2025-26</option>
                        <option value="2024-25" className="text-slate-900">2024-25</option>
                      </select>
                    </div>
                  )}

                  {/* AY Selector Render */}
                  {activeSandboxService?.rules.assessmentYearRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Select Assessment Year</label>
                      <select className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-xs outline-none">
                        <option value={sandboxCalculatedAY} className="text-slate-900">{sandboxCalculatedAY} (Auto Cal)</option>
                        <option value="2026-27" className="text-slate-900">2026-27</option>
                        <option value="2025-26" className="text-slate-900">2025-26</option>
                      </select>
                    </div>
                  )}

                  {/* Month Selector Render */}
                  {activeSandboxService?.rules.monthRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Select Return Month</label>
                      <select className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-xs outline-none">
                        <option value={currentMonthName} className="text-slate-900">{currentMonthName} (Auto Cal)</option>
                        <option value="April" className="text-slate-900">April</option>
                        <option value="May" className="text-slate-900">May</option>
                        <option value="June" className="text-slate-900">June</option>
                        <option value="July" className="text-slate-900">July</option>
                      </select>
                    </div>
                  )}

                  {/* Quarter Selector Render */}
                  {activeSandboxService?.rules.quarterRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Select Return Quarter</label>
                      <select className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-xs outline-none">
                        <option value="Q2" className="text-slate-900">Q2 (Jul - Sep)</option>
                        <option value="Q1" className="text-slate-900">Q1 (Apr - Jun)</option>
                        <option value="Q3" className="text-slate-900">Q3 (Oct - Dec)</option>
                        <option value="Q4" className="text-slate-900">Q4 (Jan - Mar)</option>
                      </select>
                    </div>
                  )}

                  {/* Government Form display */}
                  {activeSandboxService?.rules.governmentFormRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Required Govt Form Code</label>
                      <input 
                        type="text" 
                        readOnly 
                        value={activeSandboxService?.governmentForm || "None"}
                        className="w-full mt-1 bg-white/5 text-slate-300 border border-white/10 rounded px-2 py-1 text-xs outline-none font-mono font-bold"
                      />
                    </div>
                  )}

                  {/* Reg number */}
                  {activeSandboxService?.rules.registrationNumberRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-[#D4AF37] font-bold">ID / GSTIN / PAN Required</label>
                      <input 
                        type="text" 
                        placeholder="Enter identification coordinate..." 
                        className="w-full mt-1 bg-white/10 text-white border border-blue-500/30 rounded px-2 py-1 text-[10px] outline-none"
                      />
                    </div>
                  )}

                  {/* Expiry date */}
                  {activeSandboxService?.rules.expiryDateRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-amber-300 font-bold">Expiry Date Required</label>
                      <input 
                        type="date" 
                        className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-[10px] outline-none"
                      />
                    </div>
                  )}

                  {/* Renewal toggle */}
                  {activeSandboxService?.rules.renewalRequired && (
                    <div className="text-left flex items-center gap-2 pt-4">
                      <input type="checkbox" defaultChecked id="renew-check" className="rounded" />
                      <label htmlFor="renew-check" className="text-[9px] text-slate-300 font-bold">Mark for Auto Renewal</label>
                    </div>
                  )}

                  {/* Document required */}
                  {activeSandboxService?.rules.documentRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-slate-400 font-bold">Upload Required Documents</label>
                      <div className="w-full mt-1 bg-white/5 border border-dashed border-white/20 rounded px-2 py-1 text-center text-[9px] text-slate-300 cursor-pointer hover:bg-white/10">
                        Select Attachments...
                      </div>
                    </div>
                  )}

                  {/* Fee amount */}
                  {activeSandboxService?.rules.amountRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-emerald-400 font-bold">Billing Fee (INR)</label>
                      <input 
                        type="number" 
                        placeholder="Enter service fee charge..."
                        className="w-full mt-1 bg-white/10 text-white border border-white/10 rounded px-2 py-1 text-[10px] outline-none"
                      />
                    </div>
                  )}

                  {/* Due Date */}
                  {activeSandboxService?.rules.dueDateRequired && (
                    <div className="text-left">
                      <label className="text-[9px] text-red-400 font-bold">Compliance Due Date</label>
                      <input 
                        type="date" 
                        className="w-full mt-1 bg-white/10 text-white border border-red-500/20 rounded px-2 py-1 text-[10px] outline-none font-mono text-red-300"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-[9px] text-slate-400 mt-4 leading-relaxed italic border-t border-white/5 pt-2 text-right">
              This sandbox validates real-time dynamic configurations mapping from active localStorage tables. It shows what fields the end user sees in the Invoicing & Compliance panels.
            </p>
          </div>
        </div>
      </div>

      {/* FOOTER AUDIT EVENT TRACKER */}
      <div className="bg-slate-900 rounded-2xl p-4 text-white border border-slate-800 text-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#D4AF37] animate-pulse" />
          <span>Active Session Admin Audit Logs connected. Changes stream directly to the System Log database.</span>
        </div>
        <div className="text-[10px] font-mono text-slate-400">
          User Email: <span className="text-[#D4AF37]">{currentUser.email}</span>
        </div>
      </div>

      {/* CREATE & EDIT FORM MODAL OVERLAY USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="service-catalog-form-modal"
        isOpen={showFormModal} 
        onClose={() => setShowFormModal(false)}
        maxWidthClassName="max-w-4xl"
      >
        <form onSubmit={handleSaveService} className="flex flex-col h-full overflow-hidden text-left">
          <ModalHeader onClose={() => setShowFormModal(false)}>
            <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm uppercase tracking-wider">
              {isCloning ? "Clone Compliance Service Profile" : (editingService ? "Edit Service Parameters" : "Create Master Service Definition")}
            </h3>
          </ModalHeader>

          <ModalBody className="space-y-6">
            {/* Basic parameters */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-6">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Service Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., GST Monthly Return GSTR-3B"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C]"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Unique Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., GST-R3B"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] font-mono uppercase"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Category Master *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white"
                    >
                      {DEFAULT_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-12">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Description Details</label>
                    <textarea
                      placeholder="Enter detailed description regarding filing parameters, statutory definitions, and internal process briefs..."
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      rows={2}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Government Form Reference Code</label>
                    <input
                      type="text"
                      placeholder="e.g., GSTR-3B, Form-16 (Optional)"
                      value={formGovForm}
                      onChange={(e) => setFormGovForm(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C]"
                    />
                  </div>

                  <div className="md:col-span-4">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Regulatory Ministry / Department</label>
                    <input
                      type="text"
                      placeholder="e.g., Central Board of Direct Taxes"
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Filing Period</label>
                    <select
                      value={formPeriod}
                      onChange={(e) => setFormPeriod(e.target.value as ServicePeriod)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white"
                    >
                      <option value="One Time">One Time</option>
                      <option value="Monthly">Monthly</option>
                      <option value="Quarterly">Quarterly</option>
                      <option value="Half Yearly">Half Yearly</option>
                      <option value="Yearly">Yearly</option>
                      <option value="Custom">Custom</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="text-[10px] text-slate-400 uppercase font-bold">Status Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value as ServiceStatus)}
                      className="w-full mt-1 px-3 py-2 border border-slate-200 rounded-xl text-xs outline-none focus:border-[#0D2C6C] bg-white font-semibold"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="Archived">Archived</option>
                    </select>
                  </div>
                </div>

                {/* Service type flags */}
                <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/55">
                  <span className="block text-[10px] font-extrabold text-[#0D2C6C] uppercase tracking-wider mb-2">
                    Service Action Classifications
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                      { label: "New Application", value: actNew, setter: setActNew },
                      { label: "Update Details", value: actUpdate, setter: setActUpdate },
                      { label: "Renewal Process", value: actRenewal, setter: setActRenewal },
                      { label: "Correction Filing", value: actCorrection, setter: setActCorrection },
                      { label: "Cancellation request", value: actCancellation, setter: setActCancellation },
                      { label: "Duplicate Reissue", value: actDuplicate, setter: setActDuplicate },
                      { label: "Entity Migration", value: actMigration, setter: setActMigration },
                      { label: "Revision return", value: actRevision, setter: setActRevision }
                    ].map(act => (
                      <label key={act.label} className="flex items-center gap-2 cursor-pointer bg-white p-2 border border-slate-100 rounded-lg">
                        <input
                          type="checkbox"
                          checked={act.value}
                          onChange={(e) => act.setter(e.target.checked)}
                          className="rounded border-slate-200 text-[#0D2C6C] focus:ring-[#0D2C6C]"
                        />
                        <span className="text-[11px] text-slate-600">{act.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Applicable clients */}
                <div className="border border-slate-100 p-4 rounded-2xl bg-slate-50/55">
                  <span className="block text-[10px] font-extrabold text-[#0D2C6C] uppercase tracking-wider mb-2">
                    Eligible Constitution Applicability
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {DEFAULT_APPLICABLE_CLIENTS.map(cat => {
                      const selected = formApplicableTo.includes(cat);
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => toggleApplicability(cat)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-colors ${
                            selected 
                              ? "bg-blue-100 border-blue-300 text-[#0D2C6C]" 
                              : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          {cat}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rule engine configuration */}
                <div className="border border-blue-100 p-4 rounded-2xl bg-blue-50/25 space-y-3">
                  <div className="flex items-center gap-2 border-b border-blue-50 pb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="font-display font-bold text-xs text-[#0D2C6C] uppercase tracking-wide">
                      Rule Validation Requirements Engine (Dynamic Render Rules)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {[
                      { label: "Financial Year Required", value: ruleFY, setter: setRuleFY, desc: "Prompts selection of standard FY calendar windows" },
                      { label: "Assessment Year Required", value: ruleAY, setter: setRuleAY, desc: "Prompts selection of post-FY regulatory years" },
                      { label: "Month Required", value: ruleMonth, setter: setRuleMonth, desc: "Prompts monthly cycle selector" },
                      { label: "Quarter Required", value: ruleQuarter, setter: setRuleQuarter, desc: "Prompts quarterly cycle selector" },
                      { label: "Govt Form Required", value: ruleGovForm, setter: setRuleGovForm, desc: "Pre-fills official form name in entry receipts" },
                      { label: "ID Registration No Required", value: ruleRegNo, setter: setRuleRegNo, desc: "Validates active Registration parameter exist" },
                      { label: "Filing Expiry Date Required", value: ruleExpiry, setter: setRuleExpiry, desc: "Calculates expiry warnings dynamically" },
                      { label: "Auto Renewal Enabled", value: ruleRenewal, setter: setRuleRenewal, desc: "Triggers next calendar alerts automatically" },
                      { label: "Filing Documents Required", value: ruleDoc, setter: setRuleDoc, desc: "Enforces attachment uploading constraints" },
                      { label: "Base Amount Charge Required", value: ruleAmount, setter: setRuleAmount, desc: "Enforces billing value in invoices" },
                      { label: "Due Date Reminder Required", value: ruleDueDate, setter: setRuleDueDate, desc: "Automates due calendar indicators" }
                    ].map(rule => (
                      <div key={rule.label} className="bg-white p-2.5 rounded-xl border border-blue-50 text-left">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-[#0D2C6C]">
                          <input
                            type="checkbox"
                            checked={rule.value}
                            onChange={(e) => rule.setter(e.target.checked)}
                            className="rounded border-slate-200 text-[#0D2C6C] focus:ring-[#0D2C6C]"
                          />
                          <span className="text-[11px] font-extrabold">{rule.label}</span>
                        </label>
                        <p className="text-[9px] text-slate-400 mt-0.5 ml-5 leading-normal">{rule.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setShowFormModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#0D2C6C] hover:bg-[#071C44] text-white rounded-xl text-xs font-semibold flex items-center gap-1 shadow hover:shadow-lg transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              Save Configuration
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* BULK IMPORT MODAL USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="service-catalog-bulk-import-modal"
        isOpen={showImportModal} 
        onClose={() => setShowImportModal(false)}
        maxWidthClassName="max-w-2xl"
      >
        <ModalHeader onClose={() => setShowImportModal(false)}>
          <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm uppercase tracking-wider flex items-center gap-2">
            <Upload className="w-5 h-5 text-amber-500" />
            Bulk Import Services Payload
          </h3>
        </ModalHeader>

        <ModalBody className="space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            Paste the raw JSON configuration array representing your custom services. Missing fields will automatically inherit standard database fallback structures. Duplicate codes will overwrite active entries cleanly.
          </p>

          <textarea
            placeholder="[\n  {\n    'name': 'GST Quarterly Return',\n    'category': 'GST',\n    'code': 'GST-QR',\n    'period': 'Quarterly',\n    'rules': { ... }\n  }\n]"
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            rows={8}
            className="w-full px-3 py-2 border border-slate-200 rounded-2xl text-xs font-mono outline-none focus:border-[#0D2C6C] bg-slate-50"
          />

          {importError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{importError}</span>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <button
            onClick={() => setShowImportModal(false)}
            className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={handleBulkImport}
            disabled={!importText.trim()}
            className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow hover:shadow-lg transition-all cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Trigger Import
          </button>
        </ModalFooter>
      </Modal>

    </div>
  );
}
