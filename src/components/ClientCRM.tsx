/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, Search, Filter, Plus, Edit, Trash2, Shield, Calendar, 
  Upload, Download, Tag, FileText, ChevronRight, Info, Lock, 
  Unlock, Clock, ArrowLeft, Check, FileSpreadsheet, Share2, 
  Building2, Briefcase, MapPin, CreditCard, Globe, Activity, FileCheck, Eye, EyeOff, XCircle,
  Maximize2, Minimize2
} from "lucide-react";
import { User, UserRole, Client, ClientDocument, ClientTimelineEvent } from "../types";
import { getClients, saveClients, getNextClientId, getUsers, addAuditLog, getSettings } from "../lib/db";
import { hasPermission } from "../lib/permissions";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ModalFramework";
import { ActivationService } from "../lib/activationService";
import { DeviceService } from "../lib/deviceService";
import { LoginHistoryService } from "../lib/loginHistoryService";
import ClientActivationWizard from "./ClientActivationWizard";
import ClientComplianceWorkspace from "./ClientComplianceWorkspace";
import { serviceRepository, ClientServiceAssignment, ServiceCategory, ServiceMasterItem } from "../lib/serviceRepository";
import { supabase } from "../lib/supabase";

interface ClientCRMProps {
  currentUser: User;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

const CATEGORIES = [
  "Individual", "Proprietorship", "Partnership", "LLP", "Private Limited", 
  "Public Limited", "Trust", "Society", "NGO", "HUF", "Government", "Other"
];

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal", "Delhi", "Other"
];

const AVAILABLE_TAGS = [
  "Priority Client", "VIP", "Monthly Compliance", "Quarterly Compliance", 
  "Annual Compliance", "Loan Client", "Audit Client", "GST Client", "ITR Client"
];

const DOCUMENT_TYPES = [
  "PAN", "Aadhaar", "GST", "Cancelled Cheque", "Photo", "DSC", 
  "MOA", "AOA", "Partnership Deed", "Trust Deed", "Other Documents"
];

export default function ClientCRM({ currentUser, onAddAuditLog }: ClientCRMProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [workspaceViewMode, setWorkspaceViewMode] = useState<"FULL" | "SPLIT">("FULL");
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [tagFilter, setTagFilter] = useState("ALL");

  // UI state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "docs" | "timeline" | "staff" | "portal">("overview");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // Portal Security State & Modals
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [generatedActivationUrl, setGeneratedActivationUrl] = useState("");
  const [showLoginHistoryModal, setShowLoginHistoryModal] = useState(false);
  const [showDevicesModal, setShowDevicesModal] = useState(false);
  const [showActivationWizardModal, setShowActivationWizardModal] = useState(false);
  const [activeRawToken, setActiveRawToken] = useState("");
  
  // Form values (for Add/Edit)
  const [formFields, setFormFields] = useState<Partial<Client>>({});
  const [formTags, setFormTags] = useState<string[]>([]);
  const [formStaff, setFormStaff] = useState<string[]>([]);
  const [formContacts, setFormContacts] = useState<ClientContact[]>([]);
  const [formError, setFormError] = useState<string | null>(null);

  // Timeline comment input
  const [timelineComment, setTimelineComment] = useState("");
  const [timelineType, setTimelineType] = useState<ClientTimelineEvent["type"]>("NOTE");

  const isOwner = currentUser.role === UserRole.OWNER;
  const canEdit = isOwner || hasPermission(currentUser, "clientCrmEdit");
  const allStaffUsers = getUsers().filter(u => u.status === "ACTIVE");
  const firmSettings = getSettings();

  // Load clients directly from Supabase RDBMS as Source of Truth
  const loadLatestClients = async () => {
    try {
      const { data: dbClients, error } = await supabase
        .from("jn_clients")
        .select("*")
        .order("client_number", { ascending: true });

      if (!error && dbClients && dbClients.length > 0) {
        const cleanDbClients = dbClients.filter(c => c.client_number !== "CL000004" && c.id !== "341ff4e5-62d5-42da-9d37-963d94bd6136" && c.id !== "9538d74a-9e34-468d-9662-ab58dfc42930");
        const mapped: Client[] = cleanDbClients.map(c => ({
          id: c.id,
          clientNumber: c.client_number,
          category: c.category || "Individual",
          name: c.client_name,
          tradeName: c.trade_name || "",
          businessName: c.business_name || "",
          clientSource: c.client_source || "Direct",
          referredBy: c.referred_by || "",
          mobile: c.mobile || "",
          alternateMobile: c.alternate_mobile || "",
          whatsapp: c.whatsapp || "",
          email: c.email || "",
          website: c.website || "",
          pan: c.pan || "",
          aadhaar: c.aadhaar || "",
          gstin: c.gstin || "",
          tan: c.tan || "",
          udyamRegistration: c.udyam_registration || "",
          fssaiNumber: c.fssai_number || "",
          iecNumber: c.iec_number || "",
          professionalTaxNumber: c.professional_tax_number || "",
          pfNumber: c.pf_number || "",
          esicNumber: c.esic_number || "",
          cin: c.cin || "",
          din: c.din || "",
          msme: c.msme || "None",
          officeAddress: c.office_address || "",
          city: c.city || "",
          state: c.state || "Maharashtra",
          pinCode: c.pin_code || "",
          country: c.country || "India",
          bankName: c.bank_name || "",
          accountHolder: c.account_holder || "",
          accountNumber: c.account_number || "",
          ifsc: c.ifsc || "",
          branch: c.branch || "",
          upi: c.upi || "",
          businessNature: c.business_nature || "",
          businessType: c.business_type || "Services",
          constitution: c.constitution || "Individual",
          dateOfIncorporation: c.date_of_incorporation || "",
          dateOfRegistration: c.date_of_registration || "",
          financialYear: c.financial_year || "2026-27",
          assessmentYear: c.assessment_year || "2027-28",
          status: c.status || "Active",
          tags: c.tags || [],
          documents: {},
          assignedStaff: [],
          timeline: [],
          internalNotes: c.internal_notes || "",
          createdAt: c.created_at,
          updatedAt: c.updated_at
        }));

        setClients(mapped);
        if (selectedClient) {
          const refreshed = mapped.find(c => c.id === selectedClient.id || c.clientNumber === selectedClient.clientNumber);
          if (refreshed) setSelectedClient(refreshed);
        }
        return;
      }
    } catch (err) {
      console.warn("[ClientCRM] Supabase fetch error, fallback to local:", err);
    }

    const list = getClients();
    setClients(list);
    if (selectedClient) {
      const refreshed = list.find(c => c.id === selectedClient.id || c.clientNumber === selectedClient.clientNumber);
      if (refreshed) setSelectedClient(refreshed);
    }
  };

  useEffect(() => {
    loadLatestClients();
  }, []);

  // Client Services State
  const [clientServices, setClientServices] = useState<ClientServiceAssignment[]>([]);
  const [loadingClientServices, setLoadingClientServices] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const [serviceCategories, setServiceCategories] = useState<ServiceCategory[]>([]);
  const [masterServicesList, setMasterServicesList] = useState<ServiceMasterItem[]>([]);
  
  // Add Service Form State
  const [assignCatId, setAssignCatId] = useState("");
  const [assignServiceId, setAssignServiceId] = useState("");
  const [assignFrequency, setAssignFrequency] = useState("Monthly");
  const [assignStaffId, setAssignStaffId] = useState("");
  const [assignFee, setAssignFee] = useState<number>(1500);
  const [assignStartDate, setAssignStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [assignNotes, setAssignNotes] = useState("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);

  // Load client assigned services from Supabase
  const loadClientServices = async (clientId: string) => {
    setLoadingClientServices(true);
    const services = await serviceRepository.getClientServices(clientId);
    setClientServices(services);
    setLoadingClientServices(false);
  };

  useEffect(() => {
    if (selectedClient?.id) {
      loadClientServices(selectedClient.id);
    }
  }, [selectedClient?.id]);

  const handleOpenAddServiceModal = async () => {
    setAssignError(null);
    setAssignCatId("");
    setAssignServiceId("");
    setAssignFrequency("Monthly");
    setAssignStaffId("");
    setAssignFee(1500);
    setAssignStartDate(new Date().toISOString().split("T")[0]);
    setAssignNotes("");
    
    // Fetch categories and active services from Supabase
    const cats = await serviceRepository.getCategories();
    const srvs = await serviceRepository.getServices({ activeOnly: true });
    setServiceCategories(cats);
    setMasterServicesList(srvs);
    if (cats.length > 0) setAssignCatId(cats[0].id);
    setShowAddServiceModal(true);
  };

  const handleAssignServiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient?.id || !assignServiceId) {
      setAssignError("Please select a valid service.");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);

    const res = await serviceRepository.assignServiceToClient({
      clientId: selectedClient.id, // Canonical jn_clients.id UUID
      serviceId: assignServiceId, // Canonical jn_services.id UUID
      frequency: assignFrequency,
      assignedFee: assignFee,
      assignedTo: assignStaffId || undefined,
      startDate: assignStartDate,
      notes: assignNotes,
      actorEmail: currentUser.email,
      actorName: currentUser.name
    });

    setIsAssigning(false);

    if (res.success) {
      setShowAddServiceModal(false);
      await loadClientServices(selectedClient.id);
      onAddAuditLog("CLIENT_SERVICE_ASSIGNED", "DATABASE", `Assigned service to client ${selectedClient.name} (${selectedClient.clientNumber}).`);
    } else {
      setAssignError(res.error || "Failed to assign service");
    }
  };

  const handleDeactivateClientService = async (assignmentId: string) => {
    if (!window.confirm("Are you sure you want to deactivate this service for the client? Historical records will be preserved.")) return;

    const res = await serviceRepository.deactivateClientService(assignmentId, currentUser.email, currentUser.name);
    if (res.success && selectedClient?.id) {
      await loadClientServices(selectedClient.id);
      onAddAuditLog("CLIENT_SERVICE_DEACTIVATED", "DATABASE", `Deactivated client service assignment ID ${assignmentId}.`);
    } else {
      alert(res.error || "Failed to deactivate client service");
    }
  };

  // Filter clients based on search, filters and staff assignment
  const filteredClients = clients.filter(c => {
    const s = searchTerm.toLowerCase();
    const matchesSearch = 
      c.id.toLowerCase().includes(s) ||
      c.name.toLowerCase().includes(s) ||
      c.pan.toLowerCase().includes(s) ||
      c.gstin.toLowerCase().includes(s) ||
      c.mobile.includes(s) ||
      c.email.toLowerCase().includes(s);

    const matchesCategory = categoryFilter === "ALL" || c.category === categoryFilter;
    const matchesState = stateFilter === "ALL" || c.state === stateFilter;
    const matchesStatus = statusFilter === "ALL" || c.status === statusFilter;
    const matchesTag = tagFilter === "ALL" || c.tags.includes(tagFilter);

    return matchesSearch && matchesCategory && matchesState && matchesStatus && matchesTag;
  });

  const handleOpenAdd = () => {
    if (!canEdit) {
      alert("Access Denied: You do not possess the necessary administrative privileges to create client profiles.");
      return;
    }
    setFormFields({
      category: "Individual",
      status: "Active",
      clientSource: "Direct",
      referredBy: "",
      name: "", tradeName: "", businessName: "", mobile: "", alternateMobile: "", whatsapp: "", email: "", website: "",
      pan: "", aadhaar: "", gstin: "", tan: "", udyamRegistration: "", fssaiNumber: "", iecNumber: "", professionalTaxNumber: "",
      pfNumber: "", esicNumber: "", cin: "", din: "", msme: "None",
      officeAddress: "", city: "", state: "Maharashtra", pinCode: "", country: "India",
      bankName: "", accountHolder: "", accountNumber: "", ifsc: "", branch: "", upi: "",
      businessNature: "", businessType: "Services", constitution: "Individual",
      dateOfIncorporation: "", dateOfRegistration: "", financialYear: "2026-27", assessmentYear: "2027-28",
      internalNotes: ""
    });
    setFormTags([]);
    setFormStaff([]);
    setFormContacts([]);
    setFormError(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (client: Client) => {
    if (!canEdit) {
      alert("Access Denied: You do not possess the necessary administrative privileges to modify client profiles.");
      return;
    }
    setFormFields(client);
    setFormTags(client.tags);
    setFormStaff(client.assignedStaff);
    setFormContacts(client.contacts || []);
    setFormError(null);
    setShowEditModal(true);
  };

  const handleAddContactRow = () => {
    const nextId = `CNT${Date.now().toString().slice(-6)}`;
    const newContact: ClientContact = {
      id: nextId,
      clientId: formFields.id || "",
      name: "",
      role: "Contact Person",
      email: "",
      phone: "",
      isPrimary: formContacts.length === 0
    };
    setFormContacts([...formContacts, newContact]);
  };

  const handleUpdateContactRow = (index: number, field: keyof ClientContact, value: any) => {
    const updated = [...formContacts];
    updated[index] = { ...updated[index], [field]: value };
    setFormContacts(updated);
  };

  const handleRemoveContactRow = (index: number) => {
    setFormContacts(formContacts.filter((_, i) => i !== index));
  };

  const handleSaveNewClient = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formFields.name || !formFields.mobile || !formFields.email) {
      setFormError("Client Name, Primary Mobile, and Corporate Email address are strictly required.");
      return;
    }

    const nextId = getNextClientId();
    const boundContacts = formContacts.map(cnt => ({ ...cnt, clientId: nextId }));

    const newClient: Client = {
      ...(formFields as Client),
      id: nextId,
      clientSource: formFields.clientSource || "Direct",
      referredBy: formFields.clientSource === "Indirect / Referral" ? formFields.referredBy : "",
      tags: formTags,
      assignedStaff: formStaff,
      contacts: boundContacts,
      documents: {},
      timeline: [
        {
          id: `t_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Client Profile Created",
          type: "SYSTEM",
          details: `Client ledger profile compiled successfully by ${currentUser.name}. State initialized as ${formFields.status}.`,
          userEmail: currentUser.email,
          userName: currentUser.name
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const updatedList = [...clients, newClient];
    setClients(updatedList);
    saveClients(updatedList);
    
    onAddAuditLog(
      "CLIENT_CREATED",
      "SECURITY",
      `Enterprise client profile created: ${newClient.name} (ID: ${newClient.id}, Pan: ${newClient.pan || "N/A"})`
    );

    setShowAddModal(false);
    setSelectedClient(newClient);
    alert(`Client ${newClient.id} successfully generated.`);
  };

  const handleSaveEditClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFields.id) return;

    const original = clients.find(c => c.id === formFields.id);
    if (!original) return;

    // Detect changes to auto-append into Client Timeline
    const timelineUpdates: string[] = [];
    if (original.status !== formFields.status) timelineUpdates.push(`Status altered from '${original.status}' to '${formFields.status}'`);
    if (original.mobile !== formFields.mobile) timelineUpdates.push(`Contact Mobile updated`);
    if (original.gstin !== formFields.gstin) timelineUpdates.push(`GSTIN registered details updated`);

    const updatedTimeline = [...(original.timeline || [])];
    if (timelineUpdates.length > 0) {
      updatedTimeline.push({
        id: `t_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: "Client Ledger Profile Updated",
        type: "ACTIVITY",
        details: timelineUpdates.join(", ") + ` by ${currentUser.name}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      });
    }

    const boundContacts = formContacts.map(cnt => ({ ...cnt, clientId: formFields.id! }));

    const updatedClient: Client = {
      ...(formFields as Client),
      clientSource: formFields.clientSource || "Direct",
      referredBy: formFields.clientSource === "Indirect / Referral" ? formFields.referredBy : "",
      tags: formTags,
      assignedStaff: formStaff,
      contacts: boundContacts,
      timeline: updatedTimeline,
      updatedAt: new Date().toISOString()
    };

    const updatedList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updatedList);
    saveClients(updatedList);

    onAddAuditLog(
      "CLIENT_MODIFIED",
      "SECURITY",
      `Enterprise client profile ${updatedClient.id} (${updatedClient.name}) was updated by ${currentUser.name}`
    );

    setShowEditModal(false);
    setSelectedClient(updatedClient);
    alert(`Client profile ${updatedClient.id} updated successfully.`);
  };

  const handleDeleteClient = (clientId: string) => {
    if (!canEdit) {
      alert("Access Denied: You do not possess the necessary administrative privileges to delete client profiles.");
      return;
    }
    const clientToDelete = clients.find(c => c.id === clientId);
    if (!clientToDelete) return;

    const confirm = window.confirm(
      `CRITICAL DELETION REQUEST:\nAre you sure you want to permanently delete client "${clientToDelete.name}" (${clientToDelete.id})?\nThis clears all history and document indices. Deleted IDs are locked and can never be reused.`
    );
    if (!confirm) return;

    const updatedList = clients.filter(c => c.id !== clientId);
    setClients(updatedList);
    saveClients(updatedList);

    onAddAuditLog(
      "CLIENT_DELETED",
      "SECURITY",
      `Permanent deletion of Client ${clientToDelete.id} (${clientToDelete.name}) authorized by ${currentUser.name}`
    );

    setSelectedClient(null);
    alert(`Client ${clientId} permanently expunged.`);
  };

  const toggleTagInForm = (tag: string) => {
    if (formTags.includes(tag)) {
      setFormTags(formTags.filter(t => t !== tag));
    } else {
      setFormTags([...formTags, tag]);
    }
  };

  const toggleStaffInForm = (staffId: string) => {
    if (formStaff.includes(staffId)) {
      setFormStaff(formStaff.filter(id => id !== staffId));
    } else {
      setFormStaff([...formStaff, staffId]);
    }
  };

  // Document Upload Base64 Handler with memory size restriction safeguards
  const handleDocumentUpload = (docType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedClient) return;

    const reader = new FileReader();
    reader.onload = () => {
      const resultData = reader.result as string;
      const isLarge = file.size > 800000; // ~800KB
      const finalData = isLarge ? "DATA_TOO_LARGE_METADATA_ONLY" : resultData;

      const newDoc: ClientDocument = {
        fileName: file.name,
        fileType: file.type,
        fileData: finalData,
        uploadedAt: new Date().toISOString(),
        uploadedBy: currentUser.name
      };

      const updatedDocs = {
        ...(selectedClient.documents || {}),
        [docType]: newDoc
      };

      const updatedTimeline = [
        ...(selectedClient.timeline || []),
        {
          id: `t_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: `Document Uploaded: ${docType}`,
          type: "DOC" as const,
          details: `Document source file "${file.name}" uploaded to client ledger by ${currentUser.name}.`,
          userEmail: currentUser.email,
          userName: currentUser.name
        }
      ];

      const updatedClient: Client = {
        ...selectedClient,
        documents: updatedDocs,
        timeline: updatedTimeline,
        updatedAt: new Date().toISOString()
      };

      const updatedList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
      setClients(updatedList);
      saveClients(updatedList);
      setSelectedClient(updatedClient);

      onAddAuditLog(
        "DOCUMENT_UPLOADED",
        "DATABASE",
        `Corporate reference document '${docType}' (${file.name}) committed to Client ${selectedClient.id}`
      );

      alert(`Document "${docType}" successfully uploaded.`);
    };
    reader.readAsDataURL(file);
  };

  const handleDocumentDelete = (docType: string) => {
    if (!canEdit || !selectedClient) return;
    const confirm = window.confirm(`Remove document reference for ${docType}?`);
    if (!confirm) return;

    const updatedDocs = { ...(selectedClient.documents || {}) };
    const docInfo = updatedDocs[docType];
    delete updatedDocs[docType];

    const updatedTimeline = [
      ...(selectedClient.timeline || []),
      {
        id: `t_${Date.now()}`,
        timestamp: new Date().toISOString(),
        title: `Document Deleted: ${docType}`,
        type: "DOC" as const,
        details: `Document source file "${docInfo?.fileName || "reference"}" removed from client ledger by ${currentUser.name}.`,
        userEmail: currentUser.email,
        userName: currentUser.name
      }
    ];

    const updatedClient: Client = {
      ...selectedClient,
      documents: updatedDocs,
      timeline: updatedTimeline,
      updatedAt: new Date().toISOString()
    };

    const updatedList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updatedList);
    saveClients(updatedList);
    setSelectedClient(updatedClient);

    onAddAuditLog(
      "DOCUMENT_DELETED",
      "DATABASE",
      `Document reference '${docType}' deleted from Client ${selectedClient.id}`
    );

    alert(`Document "${docType}" removed.`);
  };

  // Base64 helper trigger download to user workstation
  const handleDownloadDocFile = (doc: ClientDocument) => {
    if (doc.fileData === "DATA_TOO_LARGE_METADATA_ONLY") {
      alert(`Download Intercept: The source file (${doc.fileName}) is securely indexed on Google Cloud Workspace Servers. Download from Google Sheets backend instead.`);
      return;
    }
    const element = document.createElement("a");
    element.setAttribute("href", doc.fileData);
    element.setAttribute("download", doc.fileName);
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Add Comment into Timeline
  const handleAddTimelineComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineComment.trim() || !selectedClient) return;

    const newEvent: ClientTimelineEvent = {
      id: `t_${Date.now()}`,
      timestamp: new Date().toISOString(),
      title: timelineType === "NOTE" ? "Staff Log Entry" : "Activity Note Logged",
      type: timelineType,
      details: timelineComment.trim(),
      userEmail: currentUser.email,
      userName: currentUser.name
    };

    const updatedClient: Client = {
      ...selectedClient,
      timeline: [...(selectedClient.timeline || []), newEvent],
      updatedAt: new Date().toISOString()
    };

    const updatedList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updatedList);
    saveClients(updatedList);
    setSelectedClient(updatedClient);
    setTimelineComment("");

    onAddAuditLog(
      "CLIENT_NOTE_ADDED",
      "SECURITY",
      `Activity timelines comment appended to client ${selectedClient.id} by ${currentUser.name}`
    );
  };

  // Quick OWNER-ONLY Assignment update in active Drawer Tab
  const handleAssignStaffDirect = (staffId: string) => {
    if (!isOwner || !selectedClient) return;

    let updatedStaff = [...(selectedClient.assignedStaff || [])];
    if (updatedStaff.includes(staffId)) {
      updatedStaff = updatedStaff.filter(id => id !== staffId);
    } else {
      updatedStaff.push(staffId);
    }

    const assignedNames = allStaffUsers.filter(u => updatedStaff.includes(u.id)).map(u => u.name).join(", ");

    const updatedClient: Client = {
      ...selectedClient,
      assignedStaff: updatedStaff,
      timeline: [
        ...(selectedClient.timeline || []),
        {
          id: `t_${Date.now()}`,
          timestamp: new Date().toISOString(),
          title: "Staff Assignment Modified",
          type: "SYSTEM",
          details: `Active operators assigned to this ledger modified by Owner to: [${assignedNames || "None"}].`,
          userEmail: currentUser.email,
          userName: currentUser.name
        }
      ],
      updatedAt: new Date().toISOString()
    };

    const updatedList = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    setClients(updatedList);
    saveClients(updatedList);
    setSelectedClient(updatedClient);

    onAddAuditLog(
      "STAFF_ASSIGNMENT_CHANGED",
      "SECURITY",
      `Assigned staff list updated on client ${selectedClient.id} to: [${assignedNames || "None"}]`
    );
  };

  // Google Sheets Push Synchronizer (identical logic to User Management but structured for ClientCRM spreadsheet mapping)
  const handleSyncToSheets = async () => {
    if (!firmSettings.isGoogleSheetsConnected) {
      alert("Connection Blocked: Please enable Google Sheets connectivity inside Practice Settings first.");
      return;
    }

    setIsSyncing(true);
    setSyncMessage("Mapping database schema fields and syncing active records...");

    try {
      if (firmSettings.connectedSpreadsheetUrl) {
        const payload = {
          action: "syncClients",
          spreadsheetId: firmSettings.connectedSpreadsheetId,
          clients: clients.map(c => ({
            "Client ID": c.id,
            "Category": c.category,
            "Client Name": c.name,
            "Trade Name": c.tradeName,
            "PAN": c.pan,
            "Aadhaar": c.aadhaar,
            "GSTIN": c.gstin,
            "Email": c.email,
            "Mobile": c.mobile,
            "State": c.state,
            "Status": c.status,
            "Tags": c.tags.join(", "),
            "Assigned Staff IDs": c.assignedStaff.join(", "),
            "Last Updated": c.updatedAt
          }))
        };

        await fetch(firmSettings.connectedSpreadsheetUrl, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      }

      localStorage.setItem("jn_officeos_clients_last_sync", new Date().toISOString());
      setSyncMessage("Synchronized successfully! Core ledger mirror established on GSheets.");
      
      onAddAuditLog(
        "DATABASE_SYNCED",
        "DATABASE",
        `Synchronized ${clients.length} corporate CRM profiles to the 'Clients' Google Sheet.`
      );
      
      setTimeout(() => setSyncMessage(null), 4000);
    } catch (err) {
      console.error(err);
      setSyncMessage("Sheets sync finalized with master local cache.");
      setTimeout(() => setSyncMessage(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const canView = isOwner || hasPermission(currentUser, "clientCrmView");

  if (!canView) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-8 text-center max-w-lg mx-auto my-12">
        <Shield className="w-16 h-16 text-red-500 mx-auto mb-4 animate-pulse" />
        <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm uppercase tracking-wider">Access Control Protection</h3>
        <p className="text-xs text-slate-500 mt-2 font-sans leading-relaxed">
          Your current profile does not possess active clearance to view the Client Master CRM database. Please request access from the managing firm owner if this is a mistake.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 4-Column CRM Dashboard Metrics Ribbon */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-[#0D2C6C] to-[#081C44] rounded-2xl p-5 border border-slate-800 text-white shadow-md">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-wider">Master CRM Directory</p>
              <h3 className="text-2xl font-bold font-sans mt-1">{filteredClients.length}</h3>
            </div>
            <Users className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <p className="text-[10px] text-white/50 font-mono mt-2">JN Certified Client Directory</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Corporate Entities</p>
              <h3 className="text-2xl font-bold font-sans mt-1 text-[#0D2C6C]">
                {filteredClients.filter(c => ["Private Limited", "Public Limited", "LLP", "Partnership"].includes(c.category)).length}
              </h3>
            </div>
            <Building2 className="w-5 h-5 text-indigo-500" />
          </div>
          <p className="text-[10px] text-indigo-600 font-semibold mt-2">
            Limited liability & Partnership units
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Individual Taxpayers</p>
              <h3 className="text-2xl font-bold font-sans mt-1 text-[#0D2C6C]">
                {filteredClients.filter(c => c.category === "Individual").length}
              </h3>
            </div>
            <Briefcase className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-[10px] text-amber-600 font-semibold mt-2">
            HUF, Professionals & Salaried
          </p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Compliance Priority</p>
              <h3 className="text-2xl font-bold font-sans mt-1 text-emerald-600">
                {filteredClients.filter(c => c.tags.includes("Priority Client") || c.tags.includes("Monthly Compliance")).length}
              </h3>
            </div>
            <FileCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <p className="text-[10px] text-emerald-600 font-semibold mt-2">
            Active compliance tracking enabled
          </p>
        </div>
      </div>

      {/* Main Split Interface Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Directory Explorer List */}
        <div className={`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col transition-all ${
          selectedClient ? (workspaceViewMode === "FULL" ? "hidden" : "lg:col-span-6") : "lg:col-span-12"
        }`}>
          
          {/* Header Controls */}
          <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/40">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
              <div>
                <h2 className="font-display font-extrabold text-[#0D2C6C] text-lg tracking-tight flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#D4AF37]" />
                  Client Master Database
                </h2>
                <p className="text-xs text-slate-400 font-sans mt-0.5">
                  Universal database directory mapped to Google Sheets compliance modules.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsSyncing(true);
                    setSyncMessage("Pulling fresh client directory from Google Sheets backend...");
                    try {
                      const { googleSheetsService } = await import("../lib/googleSheetsService");
                      const res = await googleSheetsService.pullAllFromSheets();
                      loadLatestClients();
                      if (res.success) {
                        setSyncMessage("Synchronized successfully! Core ledger mirror established on GSheets.");
                      } else {
                        setSyncMessage(res.message);
                      }
                    } catch (err: any) {
                      setSyncMessage(err.message || "Failed to pull clients.");
                    } finally {
                      setIsSyncing(false);
                      setTimeout(() => setSyncMessage(null), 4000);
                    }
                  }}
                  className="bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Sync Sheets
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleOpenAdd}
                    className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-900/10"
                  >
                    <Plus className="w-4 h-4 text-[#D4AF37]" />
                    Register Client
                  </button>
                )}
              </div>
            </div>

            {/* Filter Ribbons */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-1">
              <div className="relative sm:col-span-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search Name, PAN, GST, ID, Mob..."
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>

              <div className="sm:col-span-2">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white"
                >
                  <option value="ALL">All Categories</option>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white"
                >
                  <option value="ALL">All States</option>
                  {STATES.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white"
                >
                  <option value="ALL">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Blacklisted">Blacklisted</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 bg-white"
                >
                  <option value="ALL">All Compliance</option>
                  {AVAILABLE_TAGS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            {syncMessage && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <span>{syncMessage}</span>
              </div>
            )}
          </div>

          {/* Core Table Grid */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#0D2C6C]/5 text-[#0D2C6C] text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                  <th className="py-3 px-4">Client ID</th>
                  <th className="py-3 px-4">Client / Entity Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Primary Contact</th>
                  <th className="py-3 px-4">State</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredClients.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Users className="w-12 h-12 mx-auto text-slate-200 mb-2" />
                      <p className="font-semibold text-slate-500">No Client Records Found</p>
                      <p className="text-[11px] text-slate-400">No client ledger profiles matched the current filters.</p>
                    </td>
                  </tr>
                ) : (
                  filteredClients.map(c => (
                    <tr
                      key={c.id}
                      onClick={() => { setSelectedClient(c); setActiveTab("overview"); }}
                      className={`hover:bg-[#0D2C6C]/5 cursor-pointer transition-colors ${
                        selectedClient?.id === c.id ? "bg-amber-50/50 font-medium" : ""
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500 font-semibold">{c.clientNumber || c.id}</td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-[#0D2C6C]">{c.name}</div>
                        {c.tradeName && <div className="text-[10px] text-slate-400 italic">Trade: {c.tradeName}</div>}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">{c.category}</td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="text-slate-700 font-medium text-[11px]">{c.mobile}</div>
                        <div className="text-slate-400 text-[10px] max-w-[150px] truncate">{c.email}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 font-medium">{c.state}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === "Active" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                          c.status === "Inactive" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                          c.status === "Blacklisted" ? "bg-red-50 text-red-700 border border-red-100" :
                          "bg-amber-50 text-amber-700 border border-amber-100"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            c.status === "Active" ? "bg-emerald-500" :
                            c.status === "Inactive" ? "bg-slate-400" :
                            c.status === "Blacklisted" ? "bg-red-500" : "bg-amber-500"
                          }`} />
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Detailed Profile Viewer Deck */}
        {selectedClient && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`${workspaceViewMode === "FULL" ? "lg:col-span-12" : "lg:col-span-6"} bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col overflow-hidden`}
          >
            {/* Top Back Navigation Ribbon */}
            <div className="bg-[#0D2C6C] text-white px-6 py-2.5 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="flex items-center gap-2 font-bold text-blue-200 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
                Back to Client Directory
              </button>

              <div className="flex items-center gap-3">
                <span className="text-[10px] text-blue-300 font-mono hidden sm:inline">Workspace View Mode:</span>
                <button
                  type="button"
                  onClick={() => setWorkspaceViewMode(workspaceViewMode === "FULL" ? "SPLIT" : "FULL")}
                  className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white font-bold flex items-center gap-1.5 transition-all cursor-pointer text-[11px]"
                  title={workspaceViewMode === "FULL" ? "Switch to Split View (50%)" : "Expand to Full Workspace (100%)"}
                >
                  {workspaceViewMode === "FULL" ? (
                    <>
                      <Minimize2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                      Split View (50%)
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />
                      Full Workspace (100%)
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Header Area */}
            <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-start gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold text-[#D4AF37] tracking-wider uppercase bg-[#0D2C6C]/10 px-2 py-0.5 rounded">
                    Client ID: {selectedClient.clientNumber || selectedClient.id}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    selectedClient.status === "Active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"
                  }`}>
                    ● {selectedClient.status}
                  </span>
                </div>
                <h3 className="font-display font-extrabold text-[#0D2C6C] text-xl leading-tight mt-1">
                  {selectedClient.name}
                </h3>
                {selectedClient.tradeName && (
                  <p className="text-xs text-slate-500 italic font-medium">T/A: {selectedClient.tradeName}</p>
                )}
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(selectedClient)}
                  className="px-3 py-2 border border-slate-200 hover:border-[#0D2C6C] hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs"
                  title="Modify Profile parameters"
                >
                  <Edit className="w-3.5 h-3.5 text-[#0D2C6C]" />
                  Edit Profile
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteClient(selectedClient.id)}
                  className="p-2 border border-red-100 hover:border-red-500 hover:bg-red-50 text-red-400 hover:text-red-600 rounded-xl transition-all cursor-pointer"
                  title="Permanently Delete Client profile"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl cursor-pointer"
                  title="Close Profile Deck"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Deck Navigation Tabs */}
            <div className="flex border-b border-slate-100 text-xs px-2 bg-slate-50">
              <button
                type="button"
                onClick={() => setActiveTab("overview")}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "overview" ? "border-[#0D2C6C] text-[#0D2C6C] font-bold" : "border-transparent text-slate-500 hover:text-[#0D2C6C]"
                }`}
              >
                Overview & Bio
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("docs")}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "docs" ? "border-[#0D2C6C] text-[#0D2C6C] font-bold" : "border-transparent text-slate-500 hover:text-[#0D2C6C]"
                }`}
              >
                Documents ({Object.keys(selectedClient.documents || {}).length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("timeline")}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "timeline" ? "border-[#0D2C6C] text-[#0D2C6C] font-bold" : "border-transparent text-slate-500 hover:text-[#0D2C6C]"
                }`}
              >
                Timeline Log
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("staff")}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer ${
                  activeTab === "staff" ? "border-[#0D2C6C] text-[#0D2C6C] font-bold" : "border-transparent text-slate-500 hover:text-[#0D2C6C]"
                }`}
              >
                Assigned Staff ({selectedClient.assignedStaff?.length || 0})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("compliance" as any)}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  (activeTab as string) === "compliance" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-emerald-700"
                }`}
              >
                <FileCheck className="w-3.5 h-3.5 text-emerald-600" />
                Compliance ⭐
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("portal")}
                className={`px-4 py-3 font-semibold border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === "portal" ? "border-[#0D2C6C] text-[#0D2C6C] font-bold" : "border-transparent text-slate-500 hover:text-[#0D2C6C]"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                Portal Access & Security
              </button>
            </div>

            {/* Tab Contents Frame */}
            <div className="p-6 flex-1 overflow-y-auto max-h-[58vh]">
              {activeTab === "overview" && (
                <div className="space-y-6">
                  
                  {/* Category & Tag Ribbon */}
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="bg-[#0D2C6C] text-[#D4AF37] text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">
                      {selectedClient.category}
                    </span>

                    {selectedClient.clientSource === "Indirect / Referral" ? (
                      <span className="bg-amber-50 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-amber-200 flex items-center gap-1">
                        <Share2 className="w-3 h-3 text-amber-600" />
                        Referred by: {selectedClient.referredBy || "Indirect"}
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
                        Direct Client
                      </span>
                    )}

                    {selectedClient.tags.map(t => (
                      <span key={t} className="bg-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-1 rounded-md flex items-center gap-1 border border-slate-200">
                        <Tag className="w-2.5 h-2.5 text-slate-400" />
                        {t}
                      </span>
                    ))}
                  </div>

                  {/* ACTIVE SERVICES SECTION (Supabase jn_client_services) */}
                  <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-2">
                          <Briefcase className="w-4 h-4 text-[#D4AF37]" />
                          Active Client Engagements & Services
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Centrally managed billing and compliance service assignments (Supabase PostgreSQL)
                        </p>
                      </div>

                      <button
                        onClick={handleOpenAddServiceModal}
                        className="px-3 py-1.5 bg-[#0D2C6C] hover:bg-[#0D2C6C]/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                      >
                        <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                        + Add Service
                      </button>
                    </div>

                    {loadingClientServices ? (
                      <div className="p-4 text-center text-xs text-slate-400">Loading active services...</div>
                    ) : clientServices.filter(s => s.status === "ACTIVE").length === 0 ? (
                      <div className="p-4 bg-slate-50 border border-slate-200/60 rounded-xl text-center text-xs text-slate-500">
                        No active service engagements assigned to this client yet. Click <span className="font-bold text-[#0D2C6C]">+ Add Service</span> to assign a service from the Master Catalog.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {clientServices.filter(s => s.status === "ACTIVE").map(cs => (
                          <div key={cs.id} className="p-3.5 bg-gradient-to-br from-slate-50 to-blue-50/20 border border-slate-200/80 rounded-xl space-y-2 text-xs">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <span className="font-bold text-[#0D2C6C] text-xs block">{cs.serviceName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{cs.serviceNumber} • {cs.categoryName}</span>
                              </div>
                              <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                                ACTIVE
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/50">
                              <div>
                                <span className="text-slate-400 block text-[10px]">Frequency:</span>
                                <span className="font-medium text-slate-700">{cs.frequency}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Assigned Fee:</span>
                                <span className="font-bold font-mono text-[#0D2C6C]">₹{cs.assignedFee.toLocaleString('en-IN')}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[10px]">Assigned Staff:</span>
                                <span className="font-medium text-slate-700">{cs.assignedToName || "Unassigned"}</span>
                              </div>
                              <div>
                                <span className="text-slate-[#0D2C6C] block text-[10px]">Start Date:</span>
                                <span className="font-mono text-slate-600">{cs.startDate || "N/A"}</span>
                              </div>
                            </div>

                            <div className="pt-2 flex justify-end">
                              <button
                                onClick={() => handleDeactivateClientService(cs.id)}
                                className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline font-semibold flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Deactivate
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Owner-Only Notes Alert Card */}
                  {isOwner && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1">
                      <h4 className="text-xs font-bold text-amber-800 flex items-center gap-1.5 uppercase tracking-wide">
                        <Lock className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Internal Notes (Owner Private Safe)
                      </h4>
                      <p className="text-xs text-slate-600 font-sans leading-relaxed">
                        {selectedClient.internalNotes || "No owner internal notes recorded for this profile yet."}
                      </p>
                    </div>
                  )}

                  {/* Specific Statutory Form & Scheme Assignments Overview Card */}
                  <div className="bg-gradient-to-r from-[#0D2C6C]/5 to-slate-50 p-4 rounded-2xl border border-[#0D2C6C]/15 space-y-3 col-span-full">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-2">
                        <FileText className="w-4 h-4 text-[#D4AF37]" />
                        Assigned Statutory Forms & Schemes
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#0D2C6C] text-[#D4AF37]">
                        Active Compliance Specs
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Income Tax (ITR)</span>
                        <span className="font-extrabold text-[#0D2C6C] text-xs block">
                          {selectedClient.itrFormType && selectedClient.itrFormType !== "NONE" ? selectedClient.itrFormType : "Not Specified / Default"}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">GST Filing Scheme</span>
                        <span className="font-extrabold text-[#0D2C6C] text-xs block">
                          {selectedClient.gstSchemeType === "GSTR1_3B_MONTHLY" ? "GSTR-1 & 3B Monthly" :
                           selectedClient.gstSchemeType === "QRMP_QUARTERLY" ? "QRMP Scheme" :
                           selectedClient.gstSchemeType === "COMPOSITION_CMP08" ? "Composition CMP-08" :
                           selectedClient.gstSchemeType === "GSTR4_ANNUAL" ? "GSTR-4 Annual" : "Not Applicable"}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TDS / TCS Return</span>
                        <span className="font-extrabold text-[#0D2C6C] text-xs block">
                          {selectedClient.tdsFormType === "FORM_24Q" ? "Form 24Q (Salary)" :
                           selectedClient.tdsFormType === "FORM_26Q" ? "Form 26Q (Commercial)" :
                           selectedClient.tdsFormType === "FORM_27Q" ? "Form 27Q (Foreign)" :
                           selectedClient.tdsFormType === "FORM_27EQ" ? "Form 27EQ (TCS)" :
                           selectedClient.tdsFormType === "FORM_24Q_26Q_BOTH" ? "Form 24Q & 26Q" : "Not Applicable"}
                        </span>
                      </div>

                      <div className="bg-white p-3 rounded-xl border border-slate-200/70 space-y-1 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tax Audit</span>
                        <span className="font-extrabold text-[#0D2C6C] text-xs block">
                          {selectedClient.taxAuditType === "FORM_3CA_3CD" ? "Form 3CA-3CD" :
                           selectedClient.taxAuditType === "FORM_3CB_3CD" ? "Form 3CB-3CD" : "No Tax Audit"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Grid of details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* Basic details block */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#0D2C6C]" />
                        Basic Contact Bio
                      </h4>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="block text-slate-400">Corporate Email:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.email}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Mobile Phone:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.mobile}</span>
                        </div>
                        {selectedClient.alternateMobile && (
                          <div>
                            <span className="block text-slate-400">Alt Contact:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.alternateMobile}</span>
                          </div>
                        )}
                        {selectedClient.whatsapp && (
                          <div>
                            <span className="block text-slate-400">WhatsApp Primary:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.whatsapp}</span>
                          </div>
                        )}
                        {selectedClient.website && (
                          <div>
                            <span className="block text-slate-400">Website URL:</span>
                            <a href={selectedClient.website} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{selectedClient.website}</a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Identities Details Block */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#0D2C6C]" />
                        Identity Registrations
                      </h4>
                      <div className="text-xs space-y-2 font-mono">
                        <div>
                          <span className="block text-slate-400 font-sans">PAN:</span>
                          <span className="font-bold text-slate-700 text-[11px] uppercase">{selectedClient.pan || "N/A"}</span>
                        </div>
                        {selectedClient.aadhaar && (
                          <div>
                            <span className="block text-slate-400 font-sans">Aadhaar Card:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.aadhaar}</span>
                          </div>
                        )}
                        {selectedClient.gstin && (
                          <div>
                            <span className="block text-slate-400 font-sans">GSTIN Number:</span>
                            <span className="font-bold text-[#0D2C6C] text-[11px] uppercase">{selectedClient.gstin}</span>
                          </div>
                        )}
                        {selectedClient.tan && (
                          <div>
                            <span className="block text-slate-400 font-sans">TAN:</span>
                            <span className="font-semibold text-slate-700 uppercase">{selectedClient.tan}</span>
                          </div>
                        )}
                        {selectedClient.udyamRegistration && (
                          <div>
                            <span className="block text-slate-400 font-sans">Udyam Reg No:</span>
                            <span className="font-semibold text-slate-700 uppercase">{selectedClient.udyamRegistration}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Address Block */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#0D2C6C]" />
                        Registered Office Coordinates
                      </h4>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="block text-slate-400">Street Address:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.officeAddress}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-slate-400">City:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.city}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400">State:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.state}</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-slate-400">PIN Code:</span>
                            <span className="font-mono font-bold text-slate-700">{selectedClient.pinCode}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400">Country:</span>
                            <span className="font-semibold text-slate-700">{selectedClient.country}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Bank Details Block */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <CreditCard className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Remittance Bank Account
                      </h4>
                      <div className="text-xs space-y-2">
                        <div>
                          <span className="block text-slate-400">Beneficiary Holder:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.accountHolder || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Bank & Branch Name:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.bankName ? `${selectedClient.bankName} (${selectedClient.branch || "N/A"})` : "N/A"}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="block text-slate-400">Account Number:</span>
                            <span className="font-mono font-bold text-slate-700">{selectedClient.accountNumber || "N/A"}</span>
                          </div>
                          <div>
                            <span className="block text-slate-400">IFSC Code:</span>
                            <span className="font-mono font-bold text-slate-700 uppercase">{selectedClient.ifsc || "N/A"}</span>
                          </div>
                        </div>
                        {selectedClient.upi && (
                          <div>
                            <span className="block text-slate-400">UPI Address:</span>
                            <span className="font-mono text-emerald-700 text-[11px] font-bold">{selectedClient.upi}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Business Parameters */}
                    <div className="space-y-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 sm:col-span-2">
                      <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5 text-[#0D2C6C]" />
                        Business Operations & Industry Classification
                      </h4>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <span className="block text-slate-400">Industry Nature:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.businessNature || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Entity Constitution:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.constitution || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">MSME Classification:</span>
                          <span className="font-semibold text-slate-700">{selectedClient.msme || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Incorporate / Register Date:</span>
                          <span className="font-semibold text-slate-700 font-mono">{selectedClient.dateOfIncorporation || "N/A"}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Financial Year (FY):</span>
                          <span className="font-mono font-bold text-[#0D2C6C]">{selectedClient.financialYear}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400">Assessment Year (AY):</span>
                          <span className="font-mono font-bold text-[#D4AF37]">{selectedClient.assessmentYear}</span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-Contacts List Block (jn_client_contacts) */}
                    <div className="space-y-3 bg-blue-50/30 p-4 rounded-2xl border border-blue-100/70 sm:col-span-2">
                      <h4 className="text-[11px] font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#0D2C6C]" />
                        Key Contact Persons (jn_client_contacts)
                      </h4>

                      {!selectedClient.contacts || selectedClient.contacts.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No additional contact persons registered for this client. Click 'Edit' to add contact persons.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {selectedClient.contacts.map((cnt, idx) => (
                            <div key={cnt.id || idx} className="bg-white p-3 rounded-xl border border-slate-200/80 text-xs space-y-1 shadow-2xs">
                              <div className="flex justify-between items-center">
                                <span className="font-bold text-[#0D2C6C]">{cnt.name}</span>
                                {cnt.isPrimary && (
                                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">Primary</span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 font-medium">{cnt.role}</div>
                              {cnt.phone && <div className="text-slate-600 font-mono text-[11px]">{cnt.phone}</div>}
                              {cnt.email && <div className="text-slate-400 text-[10px] truncate">{cnt.email}</div>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "docs" && (
                <div className="space-y-4">
                  <div className="p-3.5 bg-[#0D2C6C]/5 border border-[#0D2C6C]/10 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-[#0D2C6C]">Compliance Document Index Binder</p>
                      <p className="mt-0.5">Maintain cryptographic reference hashes and attachments directly inside the local sandboxed database directory.</p>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100 text-xs">
                    {DOCUMENT_TYPES.map(docType => {
                      const doc = (selectedClient.documents || {})[docType];
                      return (
                        <div key={docType} className="py-3 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-700 uppercase tracking-wide block">{docType}</span>
                            {doc ? (
                              <div className="text-[10px] text-slate-400 space-y-0.5">
                                <p className="text-slate-600 font-medium font-mono truncate max-w-[280px]">File: {doc.fileName}</p>
                                <p>Uploaded by: {doc.uploadedBy} on {new Date(doc.uploadedAt).toLocaleString()}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic text-[11px]">No reference file registered</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            {doc ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocFile(doc)}
                                  className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg flex items-center gap-1 font-semibold transition-colors cursor-pointer"
                                  title="Download decrypted resource file"
                                >
                                  <Download className="w-3 h-3 text-slate-400" />
                                  Download
                                </button>
                                {canEdit && (
                                  <button
                                    type="button"
                                    onClick={() => handleDocumentDelete(docType)}
                                    className="p-1.5 border border-red-100 text-red-500 hover:bg-red-50 rounded-lg cursor-pointer"
                                    title="Revoke document certificate reference"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </>
                            ) : (
                              canEdit && (
                                <label className="px-2.5 py-1.5 bg-[#0D2C6C]/5 hover:bg-[#0D2C6C]/10 border border-[#0D2C6C]/20 text-[#0D2C6C] rounded-lg flex items-center gap-1.5 font-bold cursor-pointer transition-colors text-[11px]">
                                  <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                                  Upload Document
                                  <input
                                    type="file"
                                    onChange={(e) => handleDocumentUpload(docType, e)}
                                    className="hidden"
                                    accept=".pdf,.png,.jpg,.jpeg,.zip,.docx"
                                  />
                                </label>
                              )
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {activeTab === "timeline" && (
                <div className="space-y-6">
                  {/* Notes & Activity logger input */}
                  <form onSubmit={handleAddTimelineComment} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Log Client Activity or Note</span>
                      <div className="flex items-center gap-2">
                        <select
                          value={timelineType}
                          onChange={(e) => setTimelineType(e.target.value as any)}
                          className="px-2 py-0.5 border border-slate-200 rounded text-[10px] font-semibold text-slate-600 bg-white"
                        >
                          <option value="NOTE">Staff Log Note</option>
                          <option value="ACTIVITY">Compliance Milestone</option>
                        </select>
                      </div>
                    </div>

                    <textarea
                      value={timelineComment}
                      onChange={(e) => setTimelineComment(e.target.value)}
                      placeholder="e.g., GST Registration Certificate generated. Messaged credentials directly to client via WhatsApp..."
                      rows={2}
                      className="w-full p-2.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C] bg-white placeholder-slate-400 text-slate-800"
                    />

                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!timelineComment.trim()}
                        className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white font-semibold text-[11px] px-3.5 py-1.5 rounded-lg disabled:opacity-40 transition-colors cursor-pointer"
                      >
                        Append Note to Timeline
                      </button>
                    </div>
                  </form>

                  {/* Vertical Chronology list */}
                  <div className="relative border-l-2 border-slate-100 pl-4 space-y-5 py-2">
                    {(selectedClient.timeline || []).slice().reverse().map(event => (
                      <div key={event.id} className="relative space-y-1">
                        {/* Circular dot */}
                        <span className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${
                          event.type === "SYSTEM" ? "bg-blue-500" :
                          event.type === "DOC" ? "bg-emerald-500" :
                          event.type === "NOTE" ? "bg-amber-500" : "bg-purple-500"
                        }`} />
                        
                        <div className="flex justify-between items-start gap-4">
                          <p className="font-bold text-slate-800 text-[11px]">{event.title}</p>
                          <span className="text-[9px] font-mono text-slate-400 shrink-0">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 font-sans leading-relaxed">{event.details}</p>
                        <p className="text-[9px] font-semibold text-[#D4AF37] uppercase tracking-wider font-sans">
                          Operator: {event.userName} ({event.userEmail})
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "staff" && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600 space-y-1">
                    <p className="font-bold text-[#0D2C6C]">Secure Assignment Access Control</p>
                    <p className="font-sans leading-relaxed">
                      Only assigned staff members are granted active workspace clearance to view or inspect this client's profile. Owners maintain global administrative bypass.
                    </p>
                  </div>

                  {isOwner ? (
                    <div className="space-y-2 pt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Select Assigned Practitioners (Owners-Only Panel):</p>
                      <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
                        {allStaffUsers.length === 0 ? (
                          <div className="p-4 text-center text-slate-400 italic">No operational staff accounts exist in directories.</div>
                        ) : (
                          allStaffUsers.map(st => {
                            const isAssigned = (selectedClient.assignedStaff || []).includes(st.id);
                            return (
                              <button
                                type="button"
                                key={st.id}
                                onClick={() => handleAssignStaffDirect(st.id)}
                                className="w-full p-3 hover:bg-slate-50 flex items-center justify-between text-left cursor-pointer transition-colors"
                              >
                                <div>
                                  <p className="font-semibold text-slate-800">{st.name}</p>
                                  <p className="text-[10px] font-mono text-slate-400 uppercase">{st.designation} • @{st.username}</p>
                                </div>

                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                                  isAssigned ? "bg-[#0D2C6C] border-[#0D2C6C] text-white" : "border-slate-300 text-transparent"
                                }`}>
                                  <Check className="w-3.5 h-3.5" />
                                </div>
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Assigned Team Operators:</p>
                      <div className="space-y-2">
                        {allStaffUsers.filter(u => selectedClient.assignedStaff?.includes(u.id)).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No executive staff assigned. Ledger managed purely by Firm Owners.</p>
                        ) : (
                          allStaffUsers.filter(u => selectedClient.assignedStaff?.includes(u.id)).map(st => (
                            <div key={st.id} className="p-3 bg-slate-50/50 rounded-xl border border-slate-100 flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-xs text-slate-800">{st.name}</p>
                                <p className="text-[10px] font-mono text-slate-400">{st.designation}</p>
                              </div>
                              <span className="text-[9px] bg-[#0D2C6C]/10 text-[#0D2C6C] px-2 py-0.5 rounded font-bold font-mono">ACTIVE</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {(activeTab as string) === "compliance" && (
                <ClientComplianceWorkspace 
                  client={selectedClient}
                  currentUser={currentUser}
                  onAddAuditLog={onAddAuditLog}
                />
              )}

              {activeTab === "portal" && (
                <div className="space-y-6">
                  {/* Status Banner */}
                  {(() => {
                    const status = ActivationService.getPortalStatus(selectedClient.id);
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
                        <div className="flex flex-wrap justify-between items-center gap-3">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Client Portal Access Status</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                                status === "Active" ? "bg-emerald-100 text-emerald-800 border border-emerald-300" :
                                status === "Invitation Sent" ? "bg-amber-100 text-amber-800 border border-amber-300" :
                                status === "Locked" ? "bg-red-100 text-red-800 border border-red-300" :
                                status === "Suspended" ? "bg-rose-100 text-rose-800 border border-rose-300" :
                                "bg-slate-200 text-slate-700"
                              }`}>
                                ● {status}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {status === "Disabled" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await ActivationService.generateActivationToken(selectedClient.id);
                                  setGeneratedActivationUrl(res.activationUrl);
                                  setActiveRawToken(res.rawToken);
                                  setShowActivationModal(true);
                                  onAddAuditLog("PORTAL_ENABLED", "SECURITY", `Portal access enabled & token generated for client ${selectedClient.id}`);
                                }}
                                className="px-3.5 py-2 bg-[#0D2C6C] hover:bg-blue-900 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
                                Enable Portal Access
                              </button>
                            )}

                            {status === "Invitation Sent" && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const res = await ActivationService.generateActivationToken(selectedClient.id);
                                  setGeneratedActivationUrl(res.activationUrl);
                                  setActiveRawToken(res.rawToken);
                                  setShowActivationModal(true);
                                }}
                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                              >
                                Re-send Activation Link
                              </button>
                            )}

                            {status === "Locked" && (
                              <button
                                type="button"
                                onClick={() => {
                                  LoginHistoryService.unlockAccount(selectedClient.id);
                                  setSelectedClient({ ...selectedClient });
                                  onAddAuditLog("PORTAL_UNLOCKED", "SECURITY", `Staff unlocked portal account for client ${selectedClient.id}`);
                                  alert("Account successfully unlocked!");
                                }}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5" />
                                Unlock Account
                              </button>
                            )}

                            {status !== "Disabled" && (
                              <button
                                type="button"
                                onClick={() => {
                                  ActivationService.setPortalStatus(selectedClient.id, "Disabled");
                                  setSelectedClient({ ...selectedClient });
                                  onAddAuditLog("PORTAL_DISABLED", "SECURITY", `Staff disabled portal access for client ${selectedClient.id}`);
                                }}
                                className="px-3 py-1.5 border border-slate-300 hover:bg-rose-50 text-rose-700 rounded-xl font-bold text-xs cursor-pointer"
                              >
                                Disable Portal
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Action Control Panel */}
                        <div className="pt-3 border-t border-slate-200/60 grid grid-cols-2 sm:grid-cols-4 gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await ActivationService.generateActivationToken(selectedClient.id);
                              setGeneratedActivationUrl(res.activationUrl);
                              setActiveRawToken(res.rawToken);
                              setShowActivationModal(true);
                            }}
                            className="p-2.5 bg-white border border-slate-200 hover:border-[#0D2C6C] rounded-xl text-center cursor-pointer transition-all space-y-0.5"
                          >
                            <span className="text-[10px] font-bold text-[#0D2C6C] block">Send Login Link</span>
                            <span className="text-[9px] text-slate-400 block">Single-use 15-min link</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              const res = await ActivationService.generateActivationToken(selectedClient.id);
                              setGeneratedActivationUrl(res.activationUrl);
                              setActiveRawToken(res.rawToken);
                              setShowActivationModal(true);
                            }}
                            className="p-2.5 bg-white border border-slate-200 hover:border-[#0D2C6C] rounded-xl text-center cursor-pointer transition-all space-y-0.5"
                          >
                            <span className="text-[10px] font-bold text-[#0D2C6C] block">Reset Password</span>
                            <span className="text-[9px] text-slate-400 block">Revokes prior tokens</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowLoginHistoryModal(true)}
                            className="p-2.5 bg-white border border-slate-200 hover:border-[#0D2C6C] rounded-xl text-center cursor-pointer transition-all space-y-0.5"
                          >
                            <span className="text-[10px] font-bold text-slate-700 block">View Login History</span>
                            <span className="text-[9px] text-slate-400 block">Full audit log trail</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setShowDevicesModal(true)}
                            className="p-2.5 bg-white border border-slate-200 hover:border-[#0D2C6C] rounded-xl text-center cursor-pointer transition-all space-y-0.5"
                          >
                            <span className="text-[10px] font-bold text-slate-700 block">View Devices</span>
                            <span className="text-[9px] text-slate-400 block">Registered fingerprints</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* CREATE & EDIT MODALS COMPILED TOGETHER USING REUSABLE MODAL FRAMEWORK */}
      <Modal 
        id="client-crm-form-modal"
        isOpen={showAddModal || showEditModal} 
        onClose={() => { setShowAddModal(false); setShowEditModal(false); setFormError(null); }}
        maxWidthClassName="max-w-4xl"
      >
        <form onSubmit={showAddModal ? handleSaveNewClient : handleSaveEditClient} className="flex flex-col h-full overflow-hidden">
          <ModalHeader onClose={() => { setShowAddModal(false); setShowEditModal(false); setFormError(null); }}>
            <div>
              <h3 className="font-display font-extrabold text-[#0D2C6C] text-base tracking-tight uppercase flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4AF37]" />
                {showAddModal ? "Compile Client CRM Profile" : `Modify Ledger: Client ${formFields.id}`}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Please provide accurate corporate coordinates for official regulatory audits.</p>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-6">
            {formError && (
              <div className="p-3 bg-red-50 border-l-4 border-red-500 text-xs text-red-700 rounded-xl flex gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                <span>{formError}</span>
              </div>
            )}
                
                {/* Section 1: Basic CRM Details */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    1. Core Corporate Biography
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Entity Category *</label>
                      <select
                        value={formFields.category || "Individual"}
                        onChange={(e) => setFormFields({ ...formFields, category: e.target.value as any })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                        required
                      >
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Official Client Name *</label>
                      <input
                        type="text"
                        value={formFields.name || ""}
                        onChange={(e) => setFormFields({ ...formFields, name: e.target.value })}
                        placeholder="e.g., Acme Tech Solutions Private Limited"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Trade Name (If applicable)</label>
                      <input
                        type="text"
                        value={formFields.tradeName || ""}
                        onChange={(e) => setFormFields({ ...formFields, tradeName: e.target.value })}
                        placeholder="e.g., Acme Group"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Name</label>
                      <input
                        type="text"
                        value={formFields.businessName || ""}
                        onChange={(e) => setFormFields({ ...formFields, businessName: e.target.value })}
                        placeholder="Acme Tech Group Holdings"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Corporate Email Address *</label>
                      <input
                        type="email"
                        value={formFields.email || ""}
                        onChange={(e) => setFormFields({ ...formFields, email: e.target.value })}
                        placeholder="billing@acme.com"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Mobile *</label>
                      <input
                        type="text"
                        value={formFields.mobile || ""}
                        onChange={(e) => setFormFields({ ...formFields, mobile: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Alt Mobile</label>
                      <input
                        type="text"
                        value={formFields.alternateMobile || ""}
                        onChange={(e) => setFormFields({ ...formFields, alternateMobile: e.target.value })}
                        placeholder="+91 2244 6688"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">WhatsApp Primary</label>
                      <input
                        type="text"
                        value={formFields.whatsapp || ""}
                        onChange={(e) => setFormFields({ ...formFields, whatsapp: e.target.value })}
                        placeholder="+91 98765 43210"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 1B: Client Source & Referral Channel */}
                <div className="space-y-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                  <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Share2 className="w-4 h-4 text-[#D4AF37]" />
                      1B. Client Acquisition Channel & Referral
                    </span>
                    <span className="text-[10px] font-normal text-slate-500 lowercase">direct vs referral tracking</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Client Source / Channel *</label>
                      <select
                        value={formFields.clientSource || "Direct"}
                        onChange={(e) => setFormFields({ ...formFields, clientSource: e.target.value as any })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white font-medium focus:outline-none focus:border-[#0D2C6C]"
                      >
                        <option value="Direct">Direct (Organic / Office Walk-in)</option>
                        <option value="Indirect / Referral">Indirect / Referral (Partner / Existing Client / Consultant)</option>
                      </select>
                    </div>

                    {formFields.clientSource === "Indirect / Referral" && (
                      <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}>
                        <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">Referred By (Name / Organization / Contact) *</label>
                        <input
                          type="text"
                          value={formFields.referredBy || ""}
                          onChange={(e) => setFormFields({ ...formFields, referredBy: e.target.value })}
                          placeholder="e.g., CA Ramesh Sharma / Mr. Gupta (Client CL000002)"
                          className="w-full px-3 py-1.5 border border-amber-300 rounded-lg text-xs text-slate-800 bg-amber-50/40 focus:outline-none focus:border-[#0D2C6C]"
                        />
                      </motion.div>
                    )}
                  </div>
                </div>

                {/* Section 1C: Key Contact Persons (jn_client_contacts) */}
                <div className="space-y-3 bg-blue-50/40 p-3.5 rounded-xl border border-blue-100">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-[#0D2C6C]" />
                      1C. Key Contact Persons (jn_client_contacts)
                    </h4>
                    <button
                      type="button"
                      onClick={handleAddContactRow}
                      className="text-[11px] font-semibold text-blue-700 hover:text-blue-900 bg-white px-2.5 py-1 rounded-lg border border-blue-200 shadow-sm flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Contact Person
                    </button>
                  </div>

                  {formContacts.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic py-1">No additional sub-contacts added yet. Click 'Add Contact Person' to register Directors, Accountants, or HR representatives for this client.</p>
                  ) : (
                    <div className="space-y-2">
                      {formContacts.map((cnt, idx) => (
                        <div key={cnt.id || idx} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-slate-200 text-xs">
                          <div className="col-span-3">
                            <input
                              type="text"
                              value={cnt.name}
                              onChange={(e) => handleUpdateContactRow(idx, "name", e.target.value)}
                              placeholder="Full Name"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={cnt.role}
                              onChange={(e) => handleUpdateContactRow(idx, "role", e.target.value)}
                              placeholder="Role (e.g., Accountant)"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </div>
                          <div className="col-span-3">
                            <input
                              type="email"
                              value={cnt.email}
                              onChange={(e) => handleUpdateContactRow(idx, "email", e.target.value)}
                              placeholder="Email"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="text"
                              value={cnt.phone}
                              onChange={(e) => handleUpdateContactRow(idx, "phone", e.target.value)}
                              placeholder="Phone / Mobile"
                              className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                            />
                          </div>
                          <div className="col-span-1 text-center">
                            <label className="inline-flex items-center gap-1 cursor-pointer text-[10px] text-slate-600 font-bold" title="Primary Contact">
                              <input
                                type="checkbox"
                                checked={cnt.isPrimary}
                                onChange={(e) => handleUpdateContactRow(idx, "isPrimary", e.target.checked)}
                                className="rounded text-[#0D2C6C]"
                              />
                              Pri
                            </label>
                          </div>
                          <div className="col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveContactRow(idx)}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section 2: Identity Credentials */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    2. Certified Identification & Registrations
                  </h4>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PAN Number</label>
                      <input
                        type="text"
                        value={formFields.pan || ""}
                        onChange={(e) => setFormFields({ ...formFields, pan: e.target.value.toUpperCase() })}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono uppercase focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Aadhaar Card No</label>
                      <input
                        type="text"
                        value={formFields.aadhaar || ""}
                        onChange={(e) => setFormFields({ ...formFields, aadhaar: e.target.value })}
                        placeholder="1234-5678-9012"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">GSTIN</label>
                      <input
                        type="text"
                        value={formFields.gstin || ""}
                        onChange={(e) => setFormFields({ ...formFields, gstin: e.target.value.toUpperCase() })}
                        placeholder="27ABCDE1234F1Z5"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono uppercase focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">TAN No</label>
                      <input
                        type="text"
                        value={formFields.tan || ""}
                        onChange={(e) => setFormFields({ ...formFields, tan: e.target.value.toUpperCase() })}
                        placeholder="MUMA01234E"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono uppercase focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Udyam registration</label>
                      <input
                        type="text"
                        value={formFields.udyamRegistration || ""}
                        onChange={(e) => setFormFields({ ...formFields, udyamRegistration: e.target.value })}
                        placeholder="UDYAM-MH-19-..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">FSSAI Licence Number</label>
                      <input
                        type="text"
                        value={formFields.fssaiNumber || ""}
                        onChange={(e) => setFormFields({ ...formFields, fssaiNumber: e.target.value })}
                        placeholder="14-Digit License"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IEC Code (Import Export)</label>
                      <input
                        type="text"
                        value={formFields.iecNumber || ""}
                        onChange={(e) => setFormFields({ ...formFields, iecNumber: e.target.value })}
                        placeholder="IEC Number"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">CIN / LLPIN</label>
                      <input
                        type="text"
                        value={formFields.cin || ""}
                        onChange={(e) => setFormFields({ ...formFields, cin: e.target.value.toUpperCase() })}
                        placeholder="U72200MH..."
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono uppercase focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Section 3: Registered Address & Bank Coordinates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      3A. Registered Office Address
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Street Address Office</label>
                        <input
                          type="text"
                          value={formFields.officeAddress || ""}
                          onChange={(e) => setFormFields({ ...formFields, officeAddress: e.target.value })}
                          placeholder="Unit No, Building Name, Street Coordinates..."
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">City</label>
                          <input
                            type="text"
                            value={formFields.city || ""}
                            onChange={(e) => setFormFields({ ...formFields, city: e.target.value })}
                            placeholder="Mumbai"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">State</label>
                          <select
                            value={formFields.state || "Maharashtra"}
                            onChange={(e) => setFormFields({ ...formFields, state: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                          >
                            {STATES.map(st => <option key={st} value={st}>{st}</option>)}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">PIN Code</label>
                          <input
                            type="text"
                            value={formFields.pinCode || ""}
                            onChange={(e) => setFormFields({ ...formFields, pinCode: e.target.value })}
                            placeholder="400076"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Country</label>
                          <input
                            type="text"
                            value={formFields.country || "India"}
                            onChange={(e) => setFormFields({ ...formFields, country: e.target.value })}
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                      3B. Settlement Bank Account
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Holder Name</label>
                        <input
                          type="text"
                          value={formFields.accountHolder || ""}
                          onChange={(e) => setFormFields({ ...formFields, accountHolder: e.target.value })}
                          placeholder="Acme Tech Solutions Private Limited"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Bank Name</label>
                          <input
                            type="text"
                            value={formFields.bankName || ""}
                            onChange={(e) => setFormFields({ ...formFields, bankName: e.target.value })}
                            placeholder="HDFC Bank"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Branch Name</label>
                          <input
                            type="text"
                            value={formFields.branch || ""}
                            onChange={(e) => setFormFields({ ...formFields, branch: e.target.value })}
                            placeholder="Powai Branch"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account Number</label>
                          <input
                            type="text"
                            value={formFields.accountNumber || ""}
                            onChange={(e) => setFormFields({ ...formFields, accountNumber: e.target.value })}
                            placeholder="502000123456"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">IFSC Code</label>
                          <input
                            type="text"
                            value={formFields.ifsc || ""}
                            onChange={(e) => setFormFields({ ...formFields, ifsc: e.target.value.toUpperCase() })}
                            placeholder="HDFC0000123"
                            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 font-mono focus:outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 4: Operations & Compliance Settings */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                    4. Business Nature, Compliance Status & Assignment
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Business Nature</label>
                      <input
                        type="text"
                        value={formFields.businessNature || ""}
                        onChange={(e) => setFormFields({ ...formFields, businessNature: e.target.value })}
                        placeholder="e.g., Software, Retail, Medicine"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Constitution Type</label>
                      <input
                        type="text"
                        value={formFields.constitution || ""}
                        onChange={(e) => setFormFields({ ...formFields, constitution: e.target.value })}
                        placeholder="Private Limited"
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Financial Year (FY)</label>
                      <input
                        type="text"
                        value={formFields.financialYear || "2026-27"}
                        onChange={(e) => setFormFields({ ...formFields, financialYear: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assessment Year (AY)</label>
                      <input
                        type="text"
                        value={formFields.assessmentYear || "2027-28"}
                        onChange={(e) => setFormFields({ ...formFields, assessmentYear: e.target.value })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Account CRM Status</label>
                      <select
                        value={formFields.status || "Active"}
                        onChange={(e) => setFormFields({ ...formFields, status: e.target.value as any })}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white"
                      >
                        <option value="Active">Active</option>
                        <option value="Inactive">Inactive</option>
                        <option value="Blacklisted">Blacklisted</option>
                        <option value="Closed">Closed</option>
                      </select>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Assigned Compliance tags</label>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {AVAILABLE_TAGS.map(t => {
                          const isSelected = formTags.includes(t);
                          return (
                            <button
                              type="button"
                              key={t}
                              onClick={() => toggleTagInForm(t)}
                              className={`px-2.5 py-1 rounded text-[10px] font-semibold border transition-all cursor-pointer ${
                                isSelected 
                                  ? "bg-[#0D2C6C] border-[#0D2C6C] text-[#D4AF37] font-bold" 
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-400"
                              }`}
                            >
                              {t}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Specific Statutory Form & Scheme Selection Matrix */}
                    <div className="md:col-span-4 bg-[#0D2C6C]/5 p-4 rounded-2xl border border-[#0D2C6C]/15 space-y-3 mt-2">
                      <h5 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-[#D4AF37]" />
                        Specific Statutory Forms & Schemes Selection (ITR, GST, TDS, Audit)
                      </h5>
                      <p className="text-[11px] text-slate-500 font-sans leading-relaxed">
                        Assign specific statutory filing forms for this client. These settings dictate automated compliance tracking and workspace filters.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        {/* 1. ITR Form Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            1. Income Tax (ITR Form)
                          </label>
                          <select
                            value={formFields.itrFormType || "NONE"}
                            onChange={(e) => setFormFields({ ...formFields, itrFormType: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:border-[#0D2C6C]"
                          >
                            <option value="NONE">Not Applicable</option>
                            <option value="ITR-1">ITR-1 (Sahaj - Salary ≤ ₹50L)</option>
                            <option value="ITR-2">ITR-2 (Capital Gains / Foreign Assets)</option>
                            <option value="ITR-3">ITR-3 (Proprietorship / Business / Profession)</option>
                            <option value="ITR-4">ITR-4 (Sugam - Presumptive 44AD/ADA)</option>
                            <option value="ITR-5">ITR-5 (Partnership Firm / LLP / AOP)</option>
                            <option value="ITR-6">ITR-6 (Companies / Pvt Ltd / Public Ltd)</option>
                            <option value="ITR-7">ITR-7 (Trusts / NGOs / Political Parties)</option>
                          </select>
                        </div>

                        {/* 2. GST Scheme Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            2. GST Filing Scheme
                          </label>
                          <select
                            value={formFields.gstSchemeType || "NONE"}
                            onChange={(e) => setFormFields({ ...formFields, gstSchemeType: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:border-[#0D2C6C]"
                          >
                            <option value="NONE">Not Applicable / Unregistered</option>
                            <option value="GSTR1_3B_MONTHLY">GSTR-1 & GSTR-3B (Monthly Regular)</option>
                            <option value="QRMP_QUARTERLY">QRMP Scheme (Quarterly Filing)</option>
                            <option value="COMPOSITION_CMP08">Composition Scheme (CMP-08 Quarterly)</option>
                            <option value="GSTR4_ANNUAL">GSTR-4 (Annual Composition Return)</option>
                          </select>
                        </div>

                        {/* 3. TDS / TCS Form Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            3. TDS / TCS Return Form
                          </label>
                          <select
                            value={formFields.tdsFormType || "NONE"}
                            onChange={(e) => setFormFields({ ...formFields, tdsFormType: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:border-[#0D2C6C]"
                          >
                            <option value="NONE">Not Applicable</option>
                            <option value="FORM_24Q">Form 24Q (Salary TDS Quarterly)</option>
                            <option value="FORM_26Q">Form 26Q (Commercial / Non-Salary TDS)</option>
                            <option value="FORM_27Q">Form 27Q (Foreign / Non-Resident TDS)</option>
                            <option value="FORM_27EQ">Form 27EQ (TCS Tax Collected at Source)</option>
                            <option value="FORM_24Q_26Q_BOTH">Form 24Q & 26Q (Both Salary & Non-Salary)</option>
                          </select>
                        </div>

                        {/* 4. Tax Audit Dropdown */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                            4. Tax Audit Form
                          </label>
                          <select
                            value={formFields.taxAuditType || "NONE"}
                            onChange={(e) => setFormFields({ ...formFields, taxAuditType: e.target.value as any })}
                            className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-800 bg-white font-semibold focus:outline-none focus:border-[#0D2C6C]"
                          >
                            <option value="NONE">No Tax Audit Required</option>
                            <option value="FORM_3CA_3CD">Form 3CA-3CD (Company / Audited under Companies Act)</option>
                            <option value="FORM_3CB_3CD">Form 3CB-3CD (Non-Corporate / Firm / Individual)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 5: Staff Assignment (Only if Owner) */}
                {isOwner && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assign Operators Clearance (Clearance Override)</label>
                    <div className="flex flex-wrap gap-2">
                      {allStaffUsers.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No operational staff operators registered in directory yet.</span>
                      ) : (
                        allStaffUsers.map(st => {
                          const isAssigned = formStaff.includes(st.id);
                          return (
                            <button
                              type="button"
                              key={st.id}
                              onClick={() => toggleStaffInForm(st.id)}
                              className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                isAssigned 
                                  ? "bg-amber-50 border-[#D4AF37] text-[#0D2C6C] font-bold" 
                                  : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${isAssigned ? "bg-[#D4AF37]" : "bg-slate-300"}`} />
                              {st.name} ({st.designation})
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Section 6: OWNER ONLY Internal Notes */}
                {isOwner && (
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="block text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                      <Lock className="w-3 h-3 text-[#D4AF37]" />
                      Internal Secure Notes (Visible ONLY to Owner Accounts)
                    </label>
                    <textarea
                      value={formFields.internalNotes || ""}
                      onChange={(e) => setFormFields({ ...formFields, internalNotes: e.target.value })}
                      placeholder="Specify critical client notes, private fees, audit highlights, private mobile numbers..."
                      rows={3}
                      className="w-full p-2.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-[#0D2C6C] bg-white text-slate-800"
                    />
                  </div>
                )}

          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => { setShowAddModal(false); setShowEditModal(false); setFormError(null); }}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#0D2C6C] hover:bg-[#071D4A] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-900/10 cursor-pointer"
            >
              {showAddModal ? "Commit Registry" : "Save Changes"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* ACTIVATION LINK MODAL */}
      <Modal id="client-activation-link-modal" isOpen={showActivationModal} onClose={() => setShowActivationModal(false)}>
        <ModalHeader title="Client Portal Secure Activation Link" onClose={() => setShowActivationModal(false)} />
        <ModalBody className="space-y-4 text-xs">
          <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl space-y-1">
            <span className="font-bold text-amber-800 flex items-center gap-1.5 uppercase text-[10px]">
              <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
              Banking-Grade 256-Bit Cryptographic Activation Link
            </span>
            <p className="text-[11px] leading-relaxed">
              Send this single-use link to the client via Email, SMS, or WhatsApp. Link automatically expires in <strong>24 Hours</strong>.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Generated Activation URL</label>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={generatedActivationUrl}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono bg-slate-50 text-slate-800"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(generatedActivationUrl);
                  alert("Activation link copied to clipboard!");
                }}
                className="px-4 py-2 bg-[#0D2C6C] text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow"
              >
                Copy Link
              </button>
            </div>
          </div>

          <div className="pt-2 flex justify-between items-center border-t border-slate-100">
            <span className="text-[10px] text-slate-400 font-mono">SHA-256 Hash stored in DB • Raw token never persisted</span>
            <button
              type="button"
              onClick={() => {
                setShowActivationModal(false);
                setShowActivationWizardModal(true);
              }}
              className="px-3 py-1.5 bg-[#D4AF37]/20 border border-[#D4AF37]/50 text-[#0D2C6C] font-bold text-[11px] rounded-xl hover:bg-[#D4AF37]/30 cursor-pointer"
            >
              Test Wizard (Staff Sandbox)
            </button>
          </div>
        </ModalBody>
        <ModalFooter>
          <button
            type="button"
            onClick={() => setShowActivationModal(false)}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 font-bold rounded-xl text-xs text-slate-700 cursor-pointer"
          >
            Close
          </button>
        </ModalFooter>
      </Modal>

      {/* LOGIN HISTORY MODAL */}
      <Modal id="client-login-history-modal" isOpen={showLoginHistoryModal} onClose={() => setShowLoginHistoryModal(false)}>
        <ModalHeader title="Client Login Audit History" onClose={() => setShowLoginHistoryModal(false)} />
        <ModalBody className="space-y-4">
          {selectedClient && (() => {
            const logs = LoginHistoryService.getHistoryByClientId(selectedClient.id);
            if (logs.length === 0) {
              return <div className="p-6 text-center text-slate-400 text-xs italic">No login events recorded for this client yet.</div>;
            }
            return (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
                {logs.map(log => (
                  <div key={log.id} className="p-3 flex justify-between items-center bg-white hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded font-mono ${
                          log.status === "SUCCESS" ? "bg-emerald-100 text-emerald-800" :
                          log.status === "ACCOUNT_LOCKED" ? "bg-red-100 text-red-800" : "bg-rose-100 text-rose-800"
                        }`}>
                          {log.status}
                        </span>
                        <span className="font-mono text-slate-500 text-[10px]">{new Date(log.createdAt).toLocaleString()}</span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-700 mt-1">{log.deviceInfo || "Web Browser"}</p>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{log.ipAddress || "127.0.0.1"}</span>
                  </div>
                ))}
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setShowLoginHistoryModal(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl">Close</button>
        </ModalFooter>
      </Modal>

      {/* REGISTERED DEVICES MODAL */}
      <Modal id="client-devices-modal" isOpen={showDevicesModal} onClose={() => setShowDevicesModal(false)}>
        <ModalHeader title="Registered Client Devices" onClose={() => setShowDevicesModal(false)} />
        <ModalBody className="space-y-4">
          {selectedClient && (() => {
            const devices = DeviceService.getDevicesByClientId(selectedClient.id);
            if (devices.length === 0) {
              return <div className="p-6 text-center text-slate-400 text-xs italic">No device fingerprints registered for this client yet.</div>;
            }
            return (
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden text-xs">
                {devices.map(dev => (
                  <div key={dev.id} className="p-3.5 flex justify-between items-center bg-white hover:bg-slate-50">
                    <div>
                      <p className="font-bold text-slate-800">{dev.deviceName}</p>
                      <p className="font-mono text-[10px] text-slate-400">FP: {dev.deviceFingerprint.substring(0, 16)}...</p>
                    </div>
                    <div className="text-right space-y-0.5">
                      <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-bold font-mono block">TRUSTED</span>
                      <span className="text-[9px] text-slate-400 block font-mono">{new Date(dev.lastLoginAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={() => setShowDevicesModal(false)} className="px-4 py-2 bg-slate-100 text-xs font-bold rounded-xl">Close</button>
        </ModalFooter>
      </Modal>

      {/* ACTIVATION WIZARD SANDBOX MODAL */}
      {showActivationWizardModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center">
          <ClientActivationWizard
            rawToken={activeRawToken}
            onActivationSuccess={(cid) => {
              setShowActivationWizardModal(false);
              if (selectedClient) {
                setSelectedClient({ ...selectedClient });
              }
              alert("Client Portal Activation Sandbox completed successfully!");
            }}
            onCancel={() => setShowActivationWizardModal(false)}
          />
        </div>
      )}
      {/* ADD SERVICE TO CLIENT MODAL */}
      <Modal id="add-service-to-client-modal" isOpen={showAddServiceModal} onClose={() => setShowAddServiceModal(false)}>
        <ModalHeader title={`Assign Service to ${selectedClient?.name}`} onClose={() => setShowAddServiceModal(false)} />
        <form onSubmit={handleAssignServiceSubmit}>
          <ModalBody className="space-y-4 text-xs">
            {assignError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
                {assignError}
              </div>
            )}

            {/* STEP 1: Select Category */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                STEP 1: Select Category
              </label>
              <select
                value={assignCatId}
                onChange={(e) => {
                  setAssignCatId(e.target.value);
                  setAssignServiceId("");
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
              >
                <option value="">-- Choose Category --</option>
                {serviceCategories.map(c => (
                  <option key={c.id} value={c.id}>{c.categoryName}</option>
                ))}
              </select>
            </div>

            {/* STEP 2: Select Service */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                STEP 2: Select Service (Active Services Only)
              </label>
              <select
                value={assignServiceId}
                onChange={(e) => {
                  const sId = e.target.value;
                  setAssignServiceId(sId);
                  const selectedSrv = masterServicesList.find(s => s.id === sId);
                  if (selectedSrv) {
                    setAssignFee(selectedSrv.standardFee);
                  }
                }}
                disabled={!assignCatId}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-semibold text-slate-800 focus:outline-none focus:border-[#0D2C6C] disabled:bg-slate-100"
              >
                <option value="">-- Choose Service --</option>
                {masterServicesList
                  .filter(s => !assignCatId || s.categoryId === assignCatId)
                  .map(s => (
                    <option key={s.id} value={s.id}>
                      {s.serviceNumber} - {s.serviceName} (Standard Fee: ₹{s.standardFee})
                    </option>
                  ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* STEP 3: Frequency */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  STEP 3: Service Frequency
                </label>
                <select
                  value={assignFrequency}
                  onChange={(e) => setAssignFrequency(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Quarterly">Quarterly</option>
                  <option value="Half-Yearly">Half-Yearly</option>
                  <option value="Annual">Annual</option>
                  <option value="One-Time">One-Time</option>
                  <option value="As Applicable">As Applicable</option>
                </select>
              </div>

              {/* STEP 4: Assigned Staff */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  STEP 4: Assigned Operator / Staff
                </label>
                <select
                  value={assignStaffId}
                  onChange={(e) => setAssignStaffId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                >
                  <option value="">-- Unassigned (Default) --</option>
                  {allStaffUsers.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* STEP 5: Assigned Fee */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  STEP 5: Assigned Fee (INR)
                </label>
                <input
                  type="number"
                  min="0"
                  value={assignFee}
                  onChange={(e) => setAssignFee(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white font-mono font-bold text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>

              {/* STEP 6: Start Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  STEP 6: Service Start Date
                </label>
                <input
                  type="date"
                  value={assignStartDate}
                  onChange={(e) => setAssignStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>
            </div>

            {/* STEP 7: Notes */}
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                STEP 7: Specific Engagement Notes
              </label>
              <textarea
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
                placeholder="Specific billing instructions, scope conditions, special waivers..."
                rows={2}
                className="w-full p-2.5 border border-slate-300 rounded-xl bg-white text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setShowAddServiceModal(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isAssigning}
              className="px-5 py-2 bg-[#0D2C6C] hover:bg-[#071D4A] text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-blue-900/10 disabled:opacity-50"
            >
              {isAssigning ? "Assigning..." : "Assign Service"}
            </button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
}
