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
  Eye, CornerDownRight, PlusCircle, Trash, Trash2, Send, CheckCircle2, ChevronDown, Printer, Copy, RotateCcw, Share2, DollarSign, Pencil
} from "lucide-react";
import { User, UserRole, Client, Service, Case } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { generateHashSync } from "../lib/hash";
import { getClients, getServices, getUsers, getWorkflows } from "../lib/db";
import { CaseRepository } from "../lib/repository";
import { FinancialRepository, Invoice, InvoiceItem, InvoiceReceipt, ClientLedgerEntry } from "../lib/financialRepository";
import { hasPermission } from "../lib/permissions";
import { WorkspaceLayout } from "./WorkspaceLayout";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "./ModalFramework";

interface FinancialEngineProps {
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

export default function FinancialEngine({ currentUser, onAddAuditLog }: FinancialEngineProps) {
  const isOwner = currentUser.role === UserRole.OWNER;
  const canCreate = isOwner || currentUser.permissions.invoiceCreate;
  const canVoid = isOwner || currentUser.permissions.invoiceVoid;

  // Tabs: "INVOICES", "LEDGERS", "REMINDERS"
  const [activeTab, setActiveTab] = useState<"INVOICES" | "LEDGERS" | "REMINDERS">("INVOICES");

  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [staffList, setStaffList] = useState<User[]>([]);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterFY, setFilterFY] = useState("ALL");
  const [filterMonth, setFilterMonth] = useState("ALL");
  const [filterStaff, setFilterStaff] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");

  // Selection for Client Ledger
  const [selectedLedgerClientId, setSelectedLedgerClientId] = useState<string>("");

  // Detailed view / print modal
  const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // New Invoice Form
  const [invoiceType, setInvoiceType] = useState<Invoice["type"]>("Tax Invoice");
  const [invoiceTargetType, setInvoiceTargetType] = useState<"case" | "client">("case");
  const [standaloneClientId, setStandaloneClientId] = useState("");
  const [linkedCaseId, setLinkedCaseId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceDueDate, setInvoiceDueDate] = useState(new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString().split("T")[0]);
  const [isGstRegistered, setIsGstRegistered] = useState(true);
  const [isInterState, setIsInterState] = useState(false); // auto computed, but customizable
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  
  // Walk-In Client Details States
  const [walkInName, setWalkInName] = useState("");
  const [walkInAddress, setWalkInAddress] = useState("");
  const [walkInMobile, setWalkInMobile] = useState("");
  const [walkInGstin, setWalkInGstin] = useState("");
  
  // New Invoice Item form list (initialized empty as requested)
  const [invoiceItems, setInvoiceItems] = useState<Omit<InvoiceItem, "id" | "taxableValue" | "total">[]>([]);

  // Temporary single item inputs
  const [tempServiceName, setTempServiceName] = useState("");
  const [tempDescription, setTempDescription] = useState("");
  const [tempQuantity, setTempQuantity] = useState(1);
  const [tempRate, setTempRate] = useState(1000);
  const [tempDiscount, setTempDiscount] = useState(0);
  const [tempGstRate, setTempGstRate] = useState(18);

  // Log Payment Form
  const [paymentInvoiceId, setPaymentInvoiceId] = useState("");
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<InvoiceReceipt["mode"]>("UPI");
  const [paymentRef, setPaymentRef] = useState("");
  const [paymentRemarks, setPaymentRemarks] = useState("");

  // Load Data
  useEffect(() => {
    refreshData();
  }, [currentUser]);

  const refreshData = async () => {
    // Live Supabase Sync fetch
    const loadedInvoices = await FinancialRepository.getInvoicesAsync(currentUser);
    setInvoices(loadedInvoices);

    const loadedCases = CaseRepository.getCases(currentUser);
    setCases(loadedCases);

    const activeClients = getClients().filter(c => c.status === "Active");
    setClients(activeClients);

    const staff = getUsers().filter(u => u.status === "ACTIVE" && u.role === UserRole.STAFF);
    setStaffList(staff);

    if (activeClients.length > 0 && !selectedLedgerClientId) {
      setSelectedLedgerClientId(activeClients[0].id);
    }
  };

  // Auto-fill client details and state classification on linkedCaseId changes
  useEffect(() => {
    if (!linkedCaseId) return;
    const selectedCase = cases.find(c => c.id === linkedCaseId);
    if (!selectedCase) return;

    // Retrieve client details
    const client = getClients().find(c => c.id === selectedCase.clientId);
    if (client) {
      // Auto classify Intra vs Inter State based on location
      const clientState = (client.state || "").toLowerCase().trim();
      const isFirmStateMaharashtra = clientState.includes("maharashtra") || client.gstin?.startsWith("27");
      setIsInterState(!isFirmStateMaharashtra);
    }

    // Prefill main item
    setTempServiceName(selectedCase.serviceName);
    setTempDescription(`Professional fees and documentation support for Case Reference: ${selectedCase.id}`);
  }, [linkedCaseId, cases]);

  // Auto-fill client details and state classification on standaloneClientId changes
  useEffect(() => {
    if (invoiceTargetType !== "client" || !standaloneClientId) return;
    if (standaloneClientId === "walk-in") {
      setIsInterState(false);
    } else {
      const client = getClients().find(c => c.id === standaloneClientId);
      if (client) {
        const clientState = (client.state || "").toLowerCase().trim();
        const isFirmStateMaharashtra = clientState.includes("maharashtra") || client.gstin?.startsWith("27");
        setIsInterState(!isFirmStateMaharashtra);
      }
    }
    // Prefill default item
    setTempServiceName("Professional Consultancy Services");
    setTempDescription("Professional consultation, advisory, and compliance services.");
  }, [standaloneClientId, invoiceTargetType]);

  // Recalculate CGST, SGST, IGST for item entries
  const computeItemGst = (rate: number, qty: number, discount: number, gstPct: number, interState: boolean) => {
    const taxable = Math.max(0, rate * qty - discount);
    const gstAmt = parseFloat(((taxable * gstPct) / 100).toFixed(2));
    
    return {
      cgst: interState ? 0 : parseFloat((gstAmt / 2).toFixed(2)),
      sgst: interState ? 0 : parseFloat((gstAmt / 2).toFixed(2)),
      igst: interState ? gstAmt : 0,
      cess: 0
    };
  };

  // Add Item handler
  const handleAddItem = () => {
    if (!tempServiceName.trim()) {
      alert("Please provide service name.");
      return;
    }

    const { cgst, sgst, igst, cess } = computeItemGst(tempRate, tempQuantity, tempDiscount, tempGstRate, isInterState);

    const newItem = {
      serviceName: tempServiceName,
      description: tempDescription || `Consultancy service`,
      quantity: tempQuantity,
      rate: tempRate,
      discount: tempDiscount,
      gstRate: tempGstRate,
      cgst,
      sgst,
      igst,
      cess
    };

    setInvoiceItems([...invoiceItems, newItem]);
    
    // Clear inputs
    setTempServiceName("");
    setTempDescription("");
    setTempQuantity(1);
    setTempRate(1000);
    setTempDiscount(0);
  };

  // Remove item
  const handleRemoveItem = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, i) => i !== index));
  };

  // Edit Invoice State
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);

  const handleOpenEditInvoice = (inv: Invoice) => {
    setEditingInvoiceId(inv.id);
    setInvoiceType(inv.type);
    setInvoiceDate(inv.date);
    setInvoiceDueDate(inv.dueDate);
    setDiscountAmount(inv.discountAmount || 0);

    if (inv.caseId) {
      setInvoiceTargetType("case");
      setLinkedCaseId(inv.caseId);
    } else {
      setInvoiceTargetType("client");
      setStandaloneClientId(inv.clientId);
      if (inv.clientId === "walk-in") {
        setWalkInName(inv.clientName);
        setWalkInAddress(inv.walkInAddress || "");
        setWalkInMobile(inv.walkInMobile || "");
        setWalkInGstin(inv.walkInGstin || "");
      }
    }

    setInvoiceItems(inv.items.map(item => ({
      serviceName: item.serviceName,
      description: item.description,
      quantity: item.quantity,
      rate: item.rate,
      discount: item.discount,
      gstRate: item.gstRate,
      cgst: item.cgst,
      sgst: item.sgst,
      igst: item.igst,
      cess: item.cess
    })));

    setIsCreateModalOpen(true);
  };

  // Main Submit handler to raise/update invoice
  const handleCreateInvoice = (e: React.FormEvent) => {
    e.preventDefault();

    if (invoiceTargetType === "case" && !linkedCaseId) {
      alert("An Invoice must always be linked to an active Corporate Case.");
      return;
    }

    if (invoiceTargetType === "client" && !standaloneClientId) {
      alert("Please select a Client to generate an invoice.");
      return;
    }

    if (invoiceTargetType === "client" && standaloneClientId === "walk-in") {
      if (!walkInName.trim()) {
        alert("Please enter the Walk-In Customer Name.");
        return;
      }
      if (!walkInAddress.trim()) {
        alert("Please enter the Walk-In Address.");
        return;
      }
      if (!walkInMobile.trim()) {
        alert("Please enter the Walk-In Mobile Number.");
        return;
      }
    }

    let finalItems = [...invoiceItems];
    if (finalItems.length === 0 && tempServiceName.trim()) {
      const { cgst, sgst, igst, cess } = computeItemGst(tempRate, tempQuantity, tempDiscount, tempGstRate, isInterState);
      finalItems.push({
        serviceName: tempServiceName.trim(),
        description: tempDescription || `Consultancy service`,
        quantity: tempQuantity,
        rate: tempRate,
        discount: tempDiscount,
        gstRate: tempGstRate,
        cgst,
        sgst,
        igst,
        cess
      });
    }

    if (finalItems.length === 0) {
      alert("Please add at least one Service line item by filling in the details and clicking 'Insert'.");
      return;
    }

    let clientName = "";
    let clientId = "";
    let caseId = "";
    let serviceId = "";
    let serviceName = "";
    let assignedStaffIds: string[] = [];
    let workflowId = "";

    if (invoiceTargetType === "case") {
      const selectedCase = cases.find(c => c.id === linkedCaseId);
      if (!selectedCase) {
        alert("Linked Case no longer valid.");
        return;
      }
      clientName = selectedCase.clientName;
      clientId = selectedCase.clientId;
      caseId = selectedCase.id;
      serviceId = selectedCase.serviceId;
      serviceName = selectedCase.serviceName;
      assignedStaffIds = selectedCase.assignedStaffIds;
      const workflow = getWorkflows().find(wf => wf.clientId === selectedCase.clientId && wf.serviceId === selectedCase.serviceId);
      workflowId = workflow?.id || selectedCase.workflowId;
    } else {
      if (standaloneClientId === "walk-in") {
        clientName = walkInName.trim();
        clientId = "walk-in";
        caseId = "";
        serviceId = "";
        serviceName = finalItems[0]?.serviceName || "Professional Consultancy Services";
        assignedStaffIds = [];
        workflowId = "";
      } else {
        const selectedClient = getClients().find(c => c.id === standaloneClientId);
        if (!selectedClient) {
          alert("Selected Client is no longer valid.");
          return;
        }
        clientName = selectedClient.name;
        clientId = selectedClient.id;
        caseId = "";
        serviceId = "";
        serviceName = finalItems[0]?.serviceName || "Professional Consultancy Services";
        assignedStaffIds = selectedClient.assignedStaff || [];
        workflowId = "";
      }
    }

    try {
      // Map temporary structure into repository items
      const itemsToSave: InvoiceItem[] = finalItems.map((item, idx) => {
        const taxableVal = item.quantity * item.rate - item.discount;
        const total = taxableVal + item.cgst + item.sgst + item.igst + item.cess;
        return {
          ...item,
          id: `item_${Date.now()}_${idx}`,
          taxableValue: parseFloat(taxableVal.toFixed(2)),
          total: parseFloat(total.toFixed(2))
        };
      });

      if (editingInvoiceId) {
        FinancialRepository.updateInvoice(editingInvoiceId, {
          type: invoiceType,
          caseId,
          clientId,
          clientName,
          serviceId,
          serviceName,
          assignedStaffIds,
          workflowId,
          date: invoiceDate,
          dueDate: invoiceDueDate,
          discountAmount: discountAmount,
          items: itemsToSave,
          walkInAddress: clientId === "walk-in" ? walkInAddress.trim() : undefined,
          walkInMobile: clientId === "walk-in" ? walkInMobile.trim() : undefined,
          walkInGstin: clientId === "walk-in" ? walkInGstin.trim() : undefined
        }, currentUser);
      } else {
        FinancialRepository.createInvoice({
          type: invoiceType,
          caseId,
          clientId,
          clientName,
          serviceId,
          serviceName,
          assignedStaffIds,
          workflowId,
          date: invoiceDate,
          dueDate: invoiceDueDate,
          discountAmount: discountAmount,
          cessAmount: 0,
          status: "Unpaid",
          items: itemsToSave,
          payments: [],
          walkInAddress: clientId === "walk-in" ? walkInAddress.trim() : undefined,
          walkInMobile: clientId === "walk-in" ? walkInMobile.trim() : undefined,
          walkInGstin: clientId === "walk-in" ? walkInGstin.trim() : undefined
        }, currentUser);

        onAddAuditLog(
          currentUser.email,
          currentUser.name,
          currentUser.role,
          "FINANCIAL_INVOICE_GENERATED",
          "DATABASE",
          invoiceTargetType === "case"
            ? `Raised ${invoiceType} for Case ${caseId}.`
            : `Raised ${invoiceType} for Client ${clientName}.`
        );
      }

      refreshData();
      setIsCreateModalOpen(false);
      setEditingInvoiceId(null);
      
      // Reset form state
      setLinkedCaseId("");
      setStandaloneClientId("");
      setInvoiceTargetType("case");
      setInvoiceItems([]);
      setDiscountAmount(0);
      setWalkInName("");
      setWalkInAddress("");
      setWalkInMobile("");
      setWalkInGstin("");

    } catch (err: any) {
      alert(err.message || "Error generating invoice.");
    }
  };

  // Delete / Void Invoice
  const handleCancelInvoice = async (invId: string) => {
    if (!confirm(`Are you absolutely sure you want to delete Invoice '${invId}'? This will permanently delete it from both local state and Supabase Database.`)) {
      return;
    }
    try {
      FinancialRepository.deleteInvoice(invId, currentUser);
      onAddAuditLog(currentUser.email, currentUser.name, currentUser.role, "FINANCIAL_INVOICE_DELETED", "DATABASE", `Deleted invoice ${invId}`);
      await refreshData();
      setViewInvoiceId(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Download Invoice as PDF using client-side html2pdf with CDN fallback to bypass iframe issues
  const handleDownloadPDF = async () => {
    const printContent = document.getElementById("printable_invoice_canvas");
    if (!printContent) return;
    setIsDownloading(true);

    try {
      // Create a clean, isolated iframe so html2canvas doesn't parse main document styles (which contain oklch/oklab)
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.bottom = "0";
      iframe.style.right = "0";
      iframe.style.width = "850px"; // Fixed width to ensure robust layout rendering
      iframe.style.height = "1100px";
      iframe.style.border = "none";
      iframe.style.visibility = "hidden";
      iframe.style.zIndex = "-9999";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not access iframe document");

      doc.open();
      doc.write(`
        <html>
          <head>
            <title>Invoice - ${viewInvoice?.id || 'Tax Invoice'}</title>
            <link rel="preconnect" href="https://fonts.googleapis.com">
            <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
            <script src="https://cdn.tailwindcss.com"></script>
            <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
            <script>
              tailwind.config = {
                theme: {
                  extend: {
                    fontFamily: {
                      sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                      display: ["Outfit", "sans-serif"],
                      mono: ["JetBrains Mono", "ui-monospace", "monospace"]
                    }
                  }
                }
              }
            </script>
            <style>
              body {
                background: white;
                color: #1e293b;
                padding: 30px;
                font-family: 'Inter', sans-serif;
              }
              * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
            </style>
          </head>
          <body class="bg-white p-2 font-sans text-xs text-slate-800">
            <div id="pdf-container" class="max-w-4xl mx-auto">
              ${printContent.innerHTML}
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  const element = document.getElementById("pdf-container");
                  const opt = {
                    margin: [10, 10, 10, 10],
                    filename: "Invoice_${viewInvoice?.id?.replace(/\//g, "_") || 'Tax_Invoice'}.pdf",
                    image: { type: 'jpeg', quality: 0.98 },
                    html2canvas: { 
                      scale: 2, 
                      useCORS: true, 
                      letterRendering: true,
                      logging: false,
                      scrollY: 0,
                      scrollX: 0
                    },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
                  };
                  
                  window.html2pdf().set(opt).from(element).save().then(function() {
                    window.parent.postMessage({ type: 'PDF_DOWNLOAD_COMPLETE', success: true }, '*');
                  }).catch(function(err) {
                    window.parent.postMessage({ type: 'PDF_DOWNLOAD_COMPLETE', success: false, error: err.toString() }, '*');
                  });
                }, 800);
              };
            </script>
          </body>
        </html>
      `);
      doc.close();

      // Wait for completion from within the iframe
      const handleMessage = (event: MessageEvent) => {
        if (event.data && event.data.type === 'PDF_DOWNLOAD_COMPLETE') {
          window.removeEventListener('message', handleMessage);
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
          setIsDownloading(false);
          if (!event.data.success) {
            console.error("PDF generation failed inside iframe:", event.data.error);
            alert("Direct PDF download failed. Attempting print view as fallback.");
            handlePrintInvoice();
          }
        }
      };

      window.addEventListener('message', handleMessage);

      // Safe fallback timer (25 seconds)
      setTimeout(() => {
        window.removeEventListener('message', handleMessage);
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
          setIsDownloading(false);
        }
      }, 25000);

    } catch (err: any) {
      console.error("PDF generation failed:", err);
      setIsDownloading(false);
      alert("Direct PDF download failed. Attempting print view as fallback.");
      handlePrintInvoice();
    }
  };

  // Print Invoice using isolated Iframe to work beautifully in all browsers and iframes
  const handlePrintInvoice = () => {
    const printContent = document.getElementById("printable_invoice_canvas");
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Invoice - ${viewInvoice?.id || 'Tax Invoice'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                    display: ["Outfit", "sans-serif"],
                    mono: ["JetBrains Mono", "ui-monospace", "monospace"]
                  }
                }
              }
            }
          </script>
          <style>
            body {
              background: white;
              color: #1e293b;
              padding: 40px;
              font-family: 'Inter', sans-serif;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white p-4 font-sans text-xs text-slate-800">
          <div class="max-w-4xl mx-auto">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 15000);
  };

  // Print Ledger Statement using isolated Iframe
  const handlePrintLedger = () => {
    const printContent = document.getElementById("printable_ledger_canvas");
    if (!printContent) return;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.bottom = "0";
    iframe.style.right = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "none";
    iframe.style.visibility = "hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) return;

    doc.open();
    doc.write(`
      <html>
        <head>
          <title>Ledger Statement - ${activeLedger?.clientName || 'Statement'}</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
          <script src="https://cdn.tailwindcss.com"></script>
          <script>
            tailwind.config = {
              theme: {
                extend: {
                  fontFamily: {
                    sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
                    display: ["Outfit", "sans-serif"],
                    mono: ["JetBrains Mono", "ui-monospace", "monospace"]
                  }
                }
              }
            }
          </script>
          <style>
            body {
              background: white;
              color: #1e293b;
              padding: 40px;
              font-family: 'Inter', sans-serif;
            }
            @media print {
              body {
                padding: 0;
                margin: 0;
              }
              @page {
                size: A4;
                margin: 15mm;
              }
            }
            * {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          </style>
        </head>
        <body class="bg-white p-4 font-sans text-xs text-slate-800">
          <div class="max-w-4xl mx-auto">
            ${printContent.innerHTML}
          </div>
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    doc.close();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 15000);
  };

  // Duplicate Invoice
  const handleDuplicateInvoice = (invId: string) => {
    try {
      const cloned = FinancialRepository.duplicateInvoice(invId, currentUser);
      alert(`Invoice duplicated successfully! New Invoice Raised: ${cloned.id}`);
      refreshData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Receipt handler
  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (paymentAmount <= 0) {
      alert("Receipt amount must be positive.");
      return;
    }
    try {
      FinancialRepository.addInvoicePayment(
        paymentInvoiceId,
        paymentAmount,
        paymentMode,
        paymentRef,
        paymentRemarks,
        currentUser
      );
      onAddAuditLog(
        currentUser.email,
        currentUser.name,
        currentUser.role,
        "FINANCIAL_RECEIPT_ISSUED",
        "DATABASE",
        `Logged payment of INR ${paymentAmount} against Invoice ${paymentInvoiceId}.`
      );
      refreshData();
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentRef("");
      setPaymentRemarks("");
    } catch (err: any) {
      alert(err.message || "Error processing payment.");
    }
  };

  // Filter invoices list
  const filteredInvoices = invoices.filter(inv => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch = !query || 
      inv.id.toLowerCase().includes(query) ||
      inv.clientName.toLowerCase().includes(query) ||
      inv.serviceName.toLowerCase().includes(query) ||
      inv.caseId.toLowerCase().includes(query) ||
      inv.grandTotal.toString().includes(query);

    const matchesFY = filterFY === "ALL" || FinancialRepository.getFinancialYear(inv.date) === filterFY;
    
    let matchesMonth = true;
    if (filterMonth !== "ALL") {
      const mVal = new Date(inv.date).getMonth() + 1; // 1-12
      matchesMonth = mVal.toString() === filterMonth;
    }

    const matchesStaff = filterStaff === "ALL" || inv.assignedStaffIds.includes(filterStaff);
    const matchesStatus = filterStatus === "ALL" || inv.status === filterStatus;
    const matchesType = filterType === "ALL" || inv.type === filterType;

    return matchesSearch && matchesFY && matchesMonth && matchesStaff && matchesStatus && matchesType;
  });

  // Calculate Outstanding KPIs
  const outstandingKpis = FinancialRepository.getOutstandingDetails();
  const remindersList = FinancialRepository.getReminders();
  const activeLedger = selectedLedgerClientId ? FinancialRepository.getLedgerByClient(selectedLedgerClientId) : null;

  // Selected invoice for detail modal
  const viewInvoice = viewInvoiceId ? invoices.find(i => i.id === viewInvoiceId) : null;

  // Unique lists of FYs for filters
  const availableFYs = Array.from(new Set(invoices.map(i => FinancialRepository.getFinancialYear(i.date))));

  return (
    <WorkspaceLayout id="financial_engine_container">
      
      {/* Premium Dark Navigation Subheader */}
      <div className="bg-[#0D2C6C] text-white p-6 rounded-2xl border border-slate-200/20 shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4" id="financial_header_banner">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 rounded-lg text-[10px] font-extrabold uppercase tracking-widest">
              Financial Engine
            </span>
            <span className="text-white/60 text-xs font-mono">JN OfficeOS Integrated</span>
          </div>
          <h1 className="font-display font-black text-2xl text-white mt-1.5 tracking-tight flex items-center gap-2">
            <Landmark className="w-6 h-6 text-[#D4AF37]" />
            Enterprise Billing & Practice Ledgers
          </h1>
          <p className="text-xs text-white/70 font-medium max-w-xl mt-1">
            Automated double-entry ledgers, dynamic financial years sequencing, multi-receipt compliance tracking, and GST automated inter-state splits.
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => {
              setEditingInvoiceId(null);
              setLinkedCaseId("");
              setStandaloneClientId("");
              setInvoiceTargetType("client");
              setInvoiceItems([]);
              setDiscountAmount(0);
              setWalkInName("");
              setWalkInAddress("");
              setWalkInMobile("");
              setWalkInGstin("");
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#c39f2e] text-[#0D2C6C] font-black text-xs px-5 py-3 rounded-xl shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 text-[#0D2C6C]" />
            Raise Corporate Invoice
          </button>
        )}
      </div>

      {/* Financial KPI Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4" id="financial_stats_bento">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Total Invoiced</span>
          <div>
            <span className="text-xl font-black text-[#0D2C6C] mt-1.5 block">₹{outstandingKpis.totalBilled.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Across all years</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-emerald-500/20 transition-all border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest block">Receipts Logged</span>
          <div>
            <span className="text-xl font-black text-emerald-600 mt-1.5 block">₹{outstandingKpis.totalCollected.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-bold text-emerald-500 block mt-0.5">
              {outstandingKpis.totalBilled > 0 ? ((outstandingKpis.totalCollected / outstandingKpis.totalBilled) * 100).toFixed(1) : 0}% Realized
            </span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-[#D4AF37]/30 transition-all">
          <span className="text-[10px] font-extrabold text-[#D4AF37] uppercase tracking-widest block">Current Outstanding</span>
          <div>
            <span className="text-xl font-black text-[#0D2C6C] mt-1.5 block">₹{outstandingKpis.balance.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-semibold text-[#D4AF37] block mt-0.5">Active receivables</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-rose-500/20 transition-all border-l-4 border-l-rose-500">
          <span className="text-[10px] font-extrabold text-rose-500 uppercase tracking-widest block">Overdue Balances</span>
          <div>
            <span className="text-xl font-black text-rose-600 mt-1.5 block">₹{outstandingKpis.overdue.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-bold text-rose-500 block mt-0.5">Passed deadline</span>
          </div>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col justify-between hover:border-amber-500/20 transition-all">
          <span className="text-[10px] font-extrabold text-indigo-500 uppercase tracking-widest block">Payments Advance</span>
          <div>
            <span className="text-xl font-black text-indigo-600 mt-1.5 block">₹{outstandingKpis.advance.toLocaleString("en-IN")}</span>
            <span className="text-[9px] font-semibold text-slate-400 block mt-0.5">Credits / Retainers</span>
          </div>
        </div>
      </div>

      {/* Primary Section Switcher Tabs */}
      <div className="flex border-b border-slate-200 gap-1" id="financial_tab_buttons">
        <button
          onClick={() => setActiveTab("INVOICES")}
          className={`px-5 py-3.5 font-extrabold text-xs transition-all uppercase tracking-wider relative cursor-pointer ${activeTab === "INVOICES" ? "text-[#0D2C6C]" : "text-slate-400 hover:text-slate-600"}`}
        >
          Invoices Directory
          {activeTab === "INVOICES" && (
            <motion.div layoutId="active_tab_line" className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#D4AF37]"></motion.div>
          )}
        </button>

        <button
          onClick={() => setActiveTab("LEDGERS")}
          className={`px-5 py-3.5 font-extrabold text-xs transition-all uppercase tracking-wider relative cursor-pointer ${activeTab === "LEDGERS" ? "text-[#0D2C6C]" : "text-slate-400 hover:text-slate-600"}`}
        >
          Double-Entry Ledgers
          {activeTab === "LEDGERS" && (
            <motion.div layoutId="active_tab_line" className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#D4AF37]"></motion.div>
          )}
        </button>

        <button
          onClick={() => setActiveTab("REMINDERS")}
          className={`px-5 py-3.5 font-extrabold text-xs transition-all uppercase tracking-wider relative cursor-pointer ${activeTab === "REMINDERS" ? "text-[#0D2C6C]" : "text-slate-400 hover:text-slate-600"} flex items-center gap-1.5`}
        >
          Automated Reminders
          {remindersList.length > 0 && (
            <span className="w-5 h-5 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-bounce shrink-0">
              {remindersList.length}
            </span>
          )}
          {activeTab === "REMINDERS" && (
            <motion.div layoutId="active_tab_line" className="absolute bottom-0 left-0 right-0 h-0.75 bg-[#D4AF37]"></motion.div>
          )}
        </button>
      </div>

      {/* Render Active Tab */}
      <div className="space-y-4" id="financial_tab_content">
        
        {/* TAB 1: INVOICES REGISTRY */}
        {activeTab === "INVOICES" && (
          <div className="space-y-4" id="invoice_registry_tab_pane">
            
            {/* Filter Panel */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-grow">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="text"
                    placeholder="Search by Invoice number, client name, service field, Case ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-[#D4AF37] text-slate-700 transition-all placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="flex items-center gap-1 px-3 py-2.5 bg-slate-50 text-slate-500 border border-slate-200 rounded-xl text-[10px] font-extrabold uppercase tracking-wider">
                    <Filter className="w-3.5 h-3.5 text-[#D4AF37]" />
                    Filter Registry
                  </span>
                  <button
                    onClick={() => {
                      setFilterFY("ALL");
                      setFilterMonth("ALL");
                      setFilterStaff("ALL");
                      setFilterStatus("ALL");
                      setFilterType("ALL");
                      setSearchQuery("");
                    }}
                    className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors px-1"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Dynamic Selectors */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Financial Year</label>
                  <select
                    value={filterFY}
                    onChange={(e) => setFilterFY(e.target.value)}
                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">All FYs</option>
                    {availableFYs.map(fy => (
                      <option key={fy} value={fy}>FY {fy}</option>
                    ))}
                    <option value="2026-27">FY 2026-27</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Month</label>
                  <select
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">All Months</option>
                    <option value="4">April</option>
                    <option value="5">May</option>
                    <option value="6">June</option>
                    <option value="7">July</option>
                    <option value="8">August</option>
                    <option value="9">September</option>
                    <option value="10">October</option>
                    <option value="11">November</option>
                    <option value="12">December</option>
                    <option value="1">January</option>
                    <option value="2">February</option>
                    <option value="3">March</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Assigned Executive</label>
                  <select
                    value={filterStaff}
                    onChange={(e) => setFilterStaff(e.target.value)}
                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">All Staff</option>
                    {staffList.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Invoice Status</label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="Unpaid">Unpaid</option>
                    <option value="Partially Paid">Partially Paid</option>
                    <option value="Paid">Paid</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest pl-1 mb-1">Invoice Category</label>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="w-full text-[10px] font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-2 outline-none focus:border-[#D4AF37]"
                  >
                    <option value="ALL">All Formats</option>
                    <option value="Tax Invoice">Tax Invoice</option>
                    <option value="Bill of Supply">Bill of Supply</option>
                    <option value="Proforma Invoice">Proforma Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Receipt Voucher">Receipt Voucher</option>
                    <option value="Payment Voucher">Payment Voucher</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Invoices Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200/50 shadow-sm overflow-hidden" id="invoices_table_card">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold text-[#0D2C6C] uppercase tracking-wider">
                  Invoices Logbook ({filteredInvoices.length})
                </span>
                <span className="text-[10px] font-bold text-[#D4AF37] bg-[#0D2C6C] px-2 py-1 rounded-md">
                  Invoices Ledger Synced
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference & Date</th>
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Linked Client / Case</th>
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Services Billed</th>
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Invoice total</th>
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                      <th className="p-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {filteredInvoices.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-10 text-center font-bold text-slate-400">
                          No corporate invoices found matching selected parameters.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map(inv => {
                        const totalPaid = inv.payments.reduce((sum, p) => sum + p.amount, 0);
                        const balanceRemaining = Math.max(0, inv.grandTotal - totalPaid);

                        return (
                          <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5">
                              <div className="font-mono font-black text-[#0D2C6C] tracking-wide text-xs">{inv.id}</div>
                              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{inv.date}</div>
                              <span className="inline-block mt-1 text-[8px] font-black px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 uppercase tracking-wider">
                                {inv.type}
                              </span>
                            </td>

                            <td className="p-3.5">
                              <div className="font-bold text-[#0D2C6C] line-clamp-1">{inv.clientName}</div>
                              <div className="font-mono text-[9px] text-slate-400 mt-0.5 flex items-center gap-1">
                                <CornerDownRight className="w-3 h-3 text-[#D4AF37]" />
                                Case Ref: {inv.caseId}
                              </div>
                            </td>

                            <td className="p-3.5">
                              <div className="font-semibold text-slate-700 line-clamp-1">{inv.serviceName}</div>
                              <span className="block text-[9px] text-slate-400 italic mt-0.5">
                                {inv.items.length} Line Item{inv.items.length > 1 ? "s" : ""}
                              </span>
                            </td>

                            <td className="p-3.5 text-right font-black text-slate-800">
                              <div className="text-xs">₹{inv.grandTotal.toLocaleString("en-IN")}</div>
                              {balanceRemaining > 0 && inv.status !== "Cancelled" ? (
                                <span className="text-[8px] text-rose-500 font-bold block mt-0.5">
                                  Bal: ₹{balanceRemaining.toLocaleString("en-IN")}
                                </span>
                              ) : (
                                inv.status === "Paid" && (
                                  <span className="text-[8px] text-emerald-500 font-bold block mt-0.5">Fully Realized</span>
                                )
                              )}
                            </td>

                            <td className="p-3.5 text-center">
                              <span className={`inline-block border px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide ${
                                inv.status === "Paid" ? "bg-emerald-50 border-emerald-200 text-emerald-700" :
                                inv.status === "Partially Paid" ? "bg-amber-50 border-amber-200 text-amber-700" :
                                inv.status === "Cancelled" ? "bg-slate-100 border-slate-200 text-slate-500" :
                                "bg-rose-50 border-rose-200 text-rose-700 animate-pulse"
                              }`}>
                                {inv.status}
                              </span>
                            </td>

                            <td className="p-3.5 text-right">
                              <div className="flex justify-end gap-1.5">
                                <button
                                  onClick={() => setViewInvoiceId(inv.id)}
                                  className="p-1.5 hover:bg-[#0D2C6C]/5 rounded-lg border border-slate-200 text-[#0D2C6C] hover:text-[#0D2C6C] transition-colors cursor-pointer"
                                  title="View Invoice Sheet"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>

                                {canCreate && inv.status !== "Cancelled" && (
                                  <button
                                    onClick={() => handleOpenEditInvoice(inv)}
                                    className="p-1.5 hover:bg-blue-50 rounded-lg border border-slate-200 text-blue-700 hover:text-blue-800 transition-colors cursor-pointer"
                                    title="Edit Invoice Details"
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {inv.status !== "Paid" && inv.status !== "Cancelled" && (
                                  <button
                                    onClick={() => {
                                      setPaymentInvoiceId(inv.id);
                                      setPaymentAmount(balanceRemaining);
                                      setIsPaymentModalOpen(true);
                                    }}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                                    title="Record Receipt Payment"
                                  >
                                    <Landmark className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                <button
                                  onClick={() => handleDuplicateInvoice(inv.id)}
                                  className="p-1.5 hover:bg-amber-50 rounded-lg border border-slate-200 text-amber-700 hover:text-amber-800 transition-colors cursor-pointer"
                                  title="Duplicate Invoice"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>

                                {canVoid && inv.status !== "Cancelled" && (
                                  <button
                                    onClick={() => handleCancelInvoice(inv.id)}
                                    className="p-1.5 hover:bg-rose-50 rounded-lg border border-slate-200 text-rose-600 hover:text-rose-700 transition-colors cursor-pointer"
                                    title="Cancel/Void Invoice"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
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
        )}

        {/* TAB 2: DOUBLE ENTRY CLIENT LEDGERS */}
        {activeTab === "LEDGERS" && (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="client_ledgers_tab_pane">
            
            {/* Left Side Client Selector */}
            <div className="xl:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-4">
              <div>
                <h3 className="text-xs font-black text-[#0D2C6C] uppercase tracking-wider">Client Portfolio Directory</h3>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Select client to inspect double-entry corporate accounting ledger.</p>
              </div>

              <div className="space-y-1.5 max-h-[450px] overflow-y-auto pr-1">
                {clients.map(cl => {
                  const isSelected = cl.id === selectedLedgerClientId;
                  const ledger = FinancialRepository.getLedgerByClient(cl.id);

                  return (
                    <button
                      key={cl.id}
                      onClick={() => setSelectedLedgerClientId(cl.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                        isSelected 
                          ? "bg-[#0D2C6C] text-white border-[#0D2C6C] shadow-md" 
                          : "bg-white hover:bg-slate-50 border-slate-100 text-slate-700"
                      }`}
                    >
                      <div className="max-w-[70%]">
                        <div className={`font-bold text-xs truncate ${isSelected ? "text-white" : "text-[#0D2C6C]"}`}>{cl.name}</div>
                        <div className={`text-[9px] mt-0.5 font-semibold ${isSelected ? "text-white/60" : "text-slate-400"}`}>ID: {cl.id}</div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-black ${isSelected ? "text-[#D4AF37]" : "text-rose-600"}`}>
                          ₹{ledger.outstandingBalance.toLocaleString("en-IN")}
                        </div>
                        <span className={`text-[8px] font-extrabold uppercase tracking-widest ${isSelected ? "text-white/50" : "text-slate-400"}`}>Due</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Side Ledger View */}
            <div className="xl:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/50 shadow-sm space-y-5">
              {activeLedger ? (
                <div id="printable_ledger_canvas" className="space-y-5 bg-white">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
                    <div>
                      <span className="text-[9px] font-black text-[#D4AF37] uppercase tracking-widest bg-[#0D2C6C] px-2 py-0.5 rounded-md">
                        Double-Entry Ledger
                      </span>
                      <h2 className="font-display font-black text-base text-[#0D2C6C] mt-2 tracking-tight">
                        Statement for {activeLedger.clientName}
                      </h2>
                    </div>

                    <div className="flex gap-2 shrink-0 print:hidden">
                      <button
                        onClick={() => handlePrintLedger()}
                        className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[10px] font-bold cursor-pointer transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Print Ledger
                      </button>
                    </div>
                  </div>

                  {/* Ledger mini KPIs */}
                  <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Billed</span>
                      <span className="font-black text-[#0D2C6C] text-sm mt-0.5 block">₹{activeLedger.totalBilled.toLocaleString("en-IN")}</span>
                    </div>

                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Realized</span>
                      <span className="font-black text-emerald-600 text-sm mt-0.5 block">₹{activeLedger.totalPaid.toLocaleString("en-IN")}</span>
                    </div>

                    <div>
                      <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Closing Balance</span>
                      <span className={`font-black text-sm mt-0.5 block ${activeLedger.outstandingBalance > 0 ? "text-rose-600" : "text-slate-600"}`}>
                        ₹{activeLedger.outstandingBalance.toLocaleString("en-IN")}
                      </span>
                    </div>
                  </div>

                  {/* Ledger History List */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reference ID</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Transaction Details</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Debit (INR)</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Credit (INR)</th>
                          <th className="p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Running Bal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 text-xs">
                        {activeLedger.entries.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                              No financial ledger transactions logged for this client yet.
                            </td>
                          </tr>
                        ) : (
                          activeLedger.entries.map((entry, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-3 text-slate-500 font-medium">{entry.date}</td>
                              <td className="p-3 font-mono font-bold text-[#0D2C6C]">{entry.id}</td>
                              <td className="p-3 text-slate-700 font-semibold">{entry.details}</td>
                              <td className="p-3 text-right font-bold text-slate-800">
                                {entry.debit > 0 ? `₹${entry.debit.toLocaleString("en-IN")}` : "-"}
                              </td>
                              <td className="p-3 text-right font-bold text-emerald-600">
                                {entry.credit > 0 ? `₹${entry.credit.toLocaleString("en-IN")}` : "-"}
                              </td>
                              <td className="p-3 text-right font-black text-slate-800">
                                ₹{entry.runningBalance.toLocaleString("en-IN")}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className="border-t border-slate-100 pt-3 flex items-center gap-1 text-[10px] text-slate-400 font-semibold italic justify-end">
                    <span>* Running balance displays net outstanding receivables. Double-entry validated.</span>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center font-bold text-slate-400">
                  Please select a Client from the catalog on the left.
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: AUTOMATED OUTSTANDING ALERTS */}
        {activeTab === "REMINDERS" && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-4" id="alerts_tab_pane">
            <div>
              <h3 className="text-xs font-black text-[#0D2C6C] uppercase tracking-wider">Receivables Aging & Actionable Reminders</h3>
              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">Automatic daily chronos evaluation of payment due deadlines.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Critical Overdue Section */}
              <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-xl space-y-3">
                <span className="flex items-center gap-1.5 text-rose-700 text-xs font-black uppercase tracking-wider">
                  <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />
                  Critical Overdue Accounts
                </span>
                
                <div className="space-y-2">
                  {remindersList.filter(r => r.type === "OVERDUE").length === 0 ? (
                    <div className="text-xs text-rose-600/70 py-4 text-center font-bold">Excellent: No accounts are overdue!</div>
                  ) : (
                    remindersList.filter(r => r.type === "OVERDUE").map((rem, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-rose-200 text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-rose-900">{rem.clientName}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">Invoice: {rem.invoiceId} • {rem.daysToDue} days overdue</div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-rose-700 block">₹{rem.amount.toLocaleString("en-IN")}</span>
                          <button 
                            onClick={() => {
                              alert(`Reminder email dispatched to client: "Dear Representative, invoice ${rem.invoiceId} of INR ${rem.amount.toLocaleString("en-IN")} is OVERDUE. Please clear immediately."`);
                            }}
                            className="text-[8px] font-black uppercase tracking-widest text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded px-1.5 py-0.5 mt-1 transition-all cursor-pointer"
                          >
                            Send Email
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Warning Section - Upcoming Due */}
              <div className="bg-amber-50/40 border border-amber-100 p-4 rounded-xl space-y-3">
                <span className="flex items-center gap-1.5 text-amber-700 text-xs font-black uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-amber-500" />
                  Due Today / Next 3-7 Days
                </span>

                <div className="space-y-2">
                  {remindersList.filter(r => r.type !== "OVERDUE").length === 0 ? (
                    <div className="text-xs text-amber-700/70 py-4 text-center font-bold">No upcoming payment deadlines.</div>
                  ) : (
                    remindersList.filter(r => r.type !== "OVERDUE").map((rem, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-amber-200 text-xs flex justify-between items-center shadow-sm">
                        <div>
                          <div className="font-bold text-slate-800">{rem.clientName}</div>
                          <div className="text-[10px] text-slate-400 mt-1 font-mono">
                            Invoice: {rem.invoiceId} • {rem.daysToDue === 0 ? "DUE TODAY" : `Due in ${rem.daysToDue} days`}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-black text-amber-700 block">₹{rem.amount.toLocaleString("en-IN")}</span>
                          <button
                            onClick={() => {
                              alert(`Pre-due reminder sent successfully for Invoice ${rem.invoiceId}`);
                            }}
                            className="text-[8px] font-black uppercase tracking-widest text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5 mt-1 transition-all cursor-pointer"
                          >
                            Send Ping
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* MODAL: CREATE CORPORATE CASE INVOICE */}
      <Modal
        id="financial-engine-create-invoice-modal"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        maxWidthClassName="max-w-4xl"
      >
        <form onSubmit={handleCreateInvoice} className="flex flex-col h-full overflow-hidden">
          <ModalHeader onClose={() => setIsCreateModalOpen(false)}>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm tracking-tight uppercase">
                  {editingInvoiceId ? `Edit Invoice: ${editingInvoiceId}` : "Generate Enterprise Corporate Invoice"}
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Invoices can be linked to a corporate case or raised standalone for any client directly.
                </p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-6">
            {/* 1. Case & Invoice Type */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-1.5 border-b border-slate-100">
                <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                  1. Case & Classification Reference
                </h4>
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceTargetType("case");
                      setStandaloneClientId("");
                      setLinkedCaseId("");
                    }}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      invoiceTargetType === "case"
                        ? "bg-white text-[#0D2C6C] shadow-sm"
                        : "text-slate-500 hover:text-[#0D2C6C]"
                    }`}
                  >
                    Link to Case
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceTargetType("client");
                      setStandaloneClientId("");
                      setLinkedCaseId("");
                    }}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                      invoiceTargetType === "client"
                        ? "bg-white text-[#0D2C6C] shadow-sm"
                        : "text-slate-500 hover:text-[#0D2C6C]"
                    }`}
                  >
                    Standalone Client
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {invoiceTargetType === "case" ? (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Select Case Reference *
                    </label>
                    <select
                      value={linkedCaseId}
                      onChange={(e) => setLinkedCaseId(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                    >
                      <option value="">-- Choose Corporate Case --</option>
                      {cases.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.id} - {c.clientName} [{c.serviceType}]
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Select Client *
                    </label>
                    <select
                      value={standaloneClientId}
                      onChange={(e) => setStandaloneClientId(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                    >
                      <option value="">-- Choose Client --</option>
                      <option value="walk-in" className="font-bold text-blue-800 bg-blue-50/50">-- Walk-In Client (Custom Input) --</option>
                      {clients.map(cl => (
                        <option key={cl.id} value={cl.id}>
                          {cl.id} - {cl.name} {cl.tradeName ? `(${cl.tradeName})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Invoice Form Category *
                  </label>
                  <select
                    value={invoiceType}
                    onChange={(e) => setInvoiceType(e.target.value as any)}
                    required
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:border-[#0D2C6C] cursor-pointer"
                  >
                    <option value="Tax Invoice">Tax Invoice</option>
                    <option value="Bill of Supply">Bill of Supply</option>
                    <option value="Proforma Invoice">Proforma Invoice</option>
                    <option value="Credit Note">Credit Note</option>
                    <option value="Debit Note">Debit Note</option>
                    <option value="Receipt Voucher">Receipt Voucher</option>
                    <option value="Payment Voucher">Payment Voucher</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    GST Territory Classification
                  </label>
                  <div className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold flex items-center justify-between text-slate-700 h-[34px]">
                    <span className="text-xs">{isInterState ? "Inter-State (IGST 18%)" : "Intra-State (CGST + SGST)"}</span>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isInterState}
                        onChange={(e) => setIsInterState(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0D2C6C]"></div>
                    </label>
                  </div>
                </div>
              </div>

              {invoiceTargetType === "client" && standaloneClientId === "walk-in" && (
                <div className="p-4 bg-amber-50/40 border border-amber-200/50 rounded-xl grid grid-cols-1 md:grid-cols-4 gap-4 mt-3">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Walk-In Customer Name *
                    </label>
                    <input
                      type="text"
                      value={walkInName}
                      onChange={(e) => setWalkInName(e.target.value)}
                      placeholder="Enter full name..."
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Mobile Number *
                    </label>
                    <input
                      type="text"
                      value={walkInMobile}
                      onChange={(e) => setWalkInMobile(e.target.value)}
                      placeholder="Enter 10-digit number..."
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      GSTIN/UID (Optional)
                    </label>
                    <input
                      type="text"
                      value={walkInGstin}
                      onChange={(e) => setWalkInGstin(e.target.value)}
                      placeholder="e.g. 27AAAAA0000A1Z0"
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    />
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Full Address *
                    </label>
                    <textarea
                      value={walkInAddress}
                      onChange={(e) => setWalkInAddress(e.target.value)}
                      placeholder="Enter complete address..."
                      rows={2}
                      className="w-full px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] resize-none"
                      required
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 2. Billing Coordinates & Schedule */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                2. Billing Coordinates & Schedule
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Billing Issue Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Payment Due Date *
                  </label>
                  <input
                    type="date"
                    value={invoiceDueDate}
                    onChange={(e) => setInvoiceDueDate(e.target.value)}
                    required
                    className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] bg-white font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* 3. Items list section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                3. Professional Service Line Items
              </h4>

              <div className="border border-slate-100 bg-slate-50/50 p-4 rounded-2xl space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-bold text-[#0D2C6C] uppercase tracking-wider">Service Line Items ({invoiceItems.length})</span>
                  <span className="text-[10px] text-slate-400 font-semibold italic">Configure item rates & GST rates</span>
                </div>

                {/* Render added items */}
                <div className="space-y-2">
                  {invoiceItems.length === 0 ? (
                    <div className="text-center p-4 bg-white border border-dashed border-slate-200 rounded-xl text-slate-400 font-medium text-[11px]">
                      No service items inserted yet. Add a service item below.
                    </div>
                  ) : (
                    invoiceItems.map((item, index) => {
                      const taxableVal = item.quantity * item.rate - item.discount;
                      const cgstAmt = item.cgst;
                      const sgstAmt = item.sgst;
                      const igstAmt = item.igst;
                      const total = taxableVal + cgstAmt + sgstAmt + igstAmt;

                      return (
                        <div key={index} className="bg-white p-3 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                          <div className="max-w-[70%]">
                            <div className="font-bold text-[#0D2C6C]">{item.serviceName}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5 font-medium line-clamp-1">{item.description}</div>
                            <div className="text-[9px] text-slate-400 mt-1 font-semibold">
                              Qty: {item.quantity} • Rate: ₹{item.rate.toLocaleString("en-IN")} • Disc: ₹{item.discount} • Taxable: ₹{taxableVal.toLocaleString("en-IN")}
                              {item.igst > 0 ? ` (IGST ${item.gstRate}%)` : ` (CGST+SGST ${item.gstRate}%)`}
                            </div>
                          </div>

                          <div className="text-right shrink-0 flex items-center gap-4">
                            <div>
                              <span className="font-bold text-slate-800">₹{total.toLocaleString("en-IN")}</span>
                              <span className="block text-[8px] text-slate-400 font-semibold">Incl GST</span>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleRemoveItem(index)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                            >
                              <Trash className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Single Item inputs form */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-3">
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">Add Professional Service Item</span>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Service Header Name (e.g. Audit fees, GST consultancy...)"
                      value={tempServiceName}
                      onChange={(e) => setTempServiceName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    />
                    <input
                      type="text"
                      placeholder="Brief item description notes..."
                      value={tempDescription}
                      onChange={(e) => setTempDescription(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                    />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Qty</label>
                      <input
                        type="number"
                        value={tempQuantity}
                        onChange={(e) => setTempQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Rate (INR)</label>
                      <input
                        type="number"
                        value={tempRate}
                        onChange={(e) => setTempRate(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">Discount Amt</label>
                      <input
                        type="number"
                        value={tempDiscount}
                        onChange={(e) => setTempDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest pl-1 mb-1">GST Rate %</label>
                      <select
                        value={tempGstRate}
                        onChange={(e) => setTempGstRate(parseInt(e.target.value))}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none cursor-pointer"
                      >
                        <option value="0">0% Exempt</option>
                        <option value="5">5% Lower</option>
                        <option value="12">12% Standard</option>
                        <option value="18">18% Standard II</option>
                        <option value="28">28% Premium</option>
                      </select>
                    </div>

                    <div className="flex items-end">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="w-full bg-[#0D2C6C] hover:bg-blue-950 text-white font-bold text-xs py-1.5 px-3 rounded-lg flex items-center justify-center gap-1 cursor-pointer transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 text-[#D4AF37]" />
                        Insert
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Global Discount */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#0D2C6C] uppercase tracking-wider pb-1.5 border-b border-slate-100 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]" />
                4. Financial Deductions & Discounts
              </h4>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Ad-hoc Invoice Discount (Flat INR)
                </label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full md:w-1/3 px-3 py-1.5 border border-slate-200 bg-white rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C]"
                  placeholder="Enter flat deduction amount..."
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Discard Draft
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#D4AF37] hover:bg-[#c29e2f] text-[#0D2C6C] font-extrabold rounded-xl text-xs transition-all shadow-md shadow-amber-900/10 cursor-pointer"
            >
              {editingInvoiceId ? "Save & Update Invoice" : "Authenticate & Raise Invoice"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* MODAL: RECORD INVOICE PAYMENT / RECEIPT */}
      <Modal
        id="financial-engine-payment-modal"
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        maxWidthClassName="max-w-md"
      >
        <form onSubmit={handleRecordPayment} className="flex flex-col h-full overflow-hidden">
          <ModalHeader onClose={() => setIsPaymentModalOpen(false)}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm tracking-tight uppercase">
                  Log Outstanding Receipt
                </h3>
                <p className="text-[10px] text-slate-400 font-medium">
                  Record client payment against referenced invoice.
                </p>
              </div>
            </div>
          </ModalHeader>

          <ModalBody className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Invoice ID Reference
              </label>
              <input
                type="text"
                value={paymentInvoiceId}
                disabled
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-500 bg-slate-50 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Receipt Collected Amount (INR) *
              </label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Math.max(1, parseFloat(e.target.value) || 0))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg font-bold text-sm text-[#0D2C6C] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Collect Mode *
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                required
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 bg-white focus:outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="UPI">UPI Transfer</option>
                <option value="NEFT">NEFT Transfer</option>
                <option value="RTGS">RTGS Transfer</option>
                <option value="Cash">Cash Currency</option>
                <option value="Cheque">Bank Cheque</option>
                <option value="Card">Credit/Debit Card</option>
                <option value="Net Banking">Net Banking</option>
                <option value="Other">Other Mode</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Transaction Ref (UTR/Cheque/UPI No)
              </label>
              <input
                type="text"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
                placeholder="e.g. UTR128391823912, CHQ091822"
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                Remarks / Internal Notes
              </label>
              <textarea
                value={paymentRemarks}
                onChange={(e) => setPaymentRemarks(e.target.value)}
                rows={2}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                placeholder="Optional details..."
              />
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shadow-md cursor-pointer"
            >
              Confirm Collection
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* DETAIL MODAL: PRINT-READY CORPORATE TAX INVOICE */}
      <AnimatePresence>
        {viewInvoice && (
          <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full flex flex-col my-8 max-h-[95vh]"
            >
              {/* Header Action Bar */}
              <div className="bg-[#0D2C6C] text-white p-4.5 flex justify-between items-center shrink-0 print:hidden">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                  <span className="font-mono font-black text-white text-xs">{viewInvoice.id}</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Download PDF Button */}
                  <button
                    onClick={handleDownloadPDF}
                    disabled={isDownloading}
                    className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-700 disabled:opacity-80 text-white px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors shadow"
                  >
                    <Download className={`w-3.5 h-3.5 ${isDownloading ? 'animate-bounce' : ''}`} />
                    {isDownloading ? "Downloading..." : "Download PDF"}
                  </button>

                  {/* Print Button */}
                  <button
                    onClick={handlePrintInvoice}
                    className="flex items-center gap-1 bg-[#D4AF37] hover:bg-[#bfa035] text-[#0D2C6C] px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors shadow"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Print Invoice
                  </button>
                  
                  {canVoid && viewInvoice.status !== "Cancelled" && (
                    <button
                      onClick={() => handleCancelInvoice(viewInvoice.id)}
                      className="bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black cursor-pointer transition-colors"
                      title="रद्द (Cancel) करें"
                    >
                      Void Invoice
                    </button>
                  )}

                  <button
                    onClick={() => setViewInvoiceId(null)}
                    className="p-1 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white cursor-pointer ml-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Collapsible/Helper info regarding Void Invoice and Print action inside Sandbox */}
              <div className="bg-slate-50 border-b border-slate-200/60 p-3 px-4.5 text-slate-600 text-[10px] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 shrink-0 print:hidden">
                <div className="flex items-start gap-2 max-w-2xl">
                  <HelpCircle className="w-4 h-4 text-[#0D2C6C] shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-slate-800">Void Invoice क्या है?</span> ये बटन इनवॉइस को रद्द (Cancel) करने के लिए है। GST नियमों के तहत इनवॉइस डिलीट नहीं किया जा सकता (ताकि serial correct रहे), इसलिए 'Void' करके इसकी वैल्यू शून्य (zero) कर दी जाती है।
                  </div>
                </div>
                <div className="text-slate-500 font-medium self-stretch md:self-auto text-right bg-[#0D2C6C]/5 p-1 px-2.5 rounded-md border border-[#0D2C6C]/10 text-[9px]">
                  💡 iframe में direct print block हो तो <strong className="text-[#0D2C6C]">Download PDF</strong> का उपयोग करें!
                </div>
              </div>

              {/* PRINT CONTENT: THE LUXURY CA FIRM LETTERHEAD */}
              <div className="flex-grow overflow-y-auto p-8 bg-white text-slate-800 text-xs font-sans print:p-0" id="printable_invoice_canvas">
                
                {/* 1. Letterhead banner */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-b-2 border-slate-900 pb-5 items-start">
                  
                  {/* Firm details */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5">
                      {/* Monogram */}
                      <div className="w-11 h-11 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-slate-100 shadow-md shrink-0">
                        <img 
                          src="/logo.jpeg" 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <h2 className="font-display font-black text-[#0D2C6C] tracking-tight text-sm uppercase">Jain Agarwal & Co.</h2>
                        <p className="text-[8px] text-[#D4AF37] uppercase tracking-widest font-black">TAX & FINANCIAL CONSULTANTS</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-relaxed max-w-sm mt-1">
                      Shop No. A6 & A7, Shree Sai Niketan CHS Ltd, Off Shriram Jewellers, Navghar Road, Bhayander East, Thane, Maharashtra 401105.
                    </p>
                    <div className="text-[9px] text-slate-400 font-semibold space-y-0.5">
                      <div>Website: www.jainnagarwal.in</div>
                      <div>Contact: +91 8828147889 • Email: jainnagarwal90@gmail.com</div>
                    </div>
                  </div>

                  {/* Invoice Header details */}
                  <div className="text-left md:text-right space-y-1.5">
                    <h1 className="font-display font-black text-xl text-[#0D2C6C] uppercase tracking-wider">{viewInvoice.type}</h1>
                    
                    <div className="inline-block bg-slate-50 border border-slate-100 p-2.5 rounded-xl space-y-1 text-[10px] text-left">
                      <div><strong className="text-slate-600">Invoice Ref:</strong> <span className="font-mono font-black text-[#0D2C6C]">{viewInvoice.id}</span></div>
                      <div><strong className="text-slate-600">Issue Date:</strong> <span className="font-bold">{viewInvoice.date}</span></div>
                      <div><strong className="text-slate-600">Due Date:</strong> <span className="font-bold text-rose-600">{viewInvoice.dueDate}</span></div>
                      <div><strong className="text-slate-600">Workflow ID:</strong> <span className="font-mono">{viewInvoice.workflowId || "WF_SYNC_01"}</span></div>
                    </div>
                  </div>

                </div>

                {/* 2. Client & Case details metadata */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-5 border-b border-slate-100 text-[10px]">
                  
                  {/* Billed To */}
                  {(() => {
                    const matchedClient = clients.find(c => c.id === viewInvoice.clientId || c.name === viewInvoice.clientName) || getClients().find(c => c.id === viewInvoice.clientId || c.name === viewInvoice.clientName);
                    
                    const clientAddress = matchedClient
                      ? [matchedClient.officeAddress, matchedClient.city, matchedClient.state, matchedClient.pinCode].filter(Boolean).join(", ")
                      : (viewInvoice.walkInAddress || "Office/Corporate premises registered on system.");
                      
                    const clientGstin = matchedClient?.gstin || viewInvoice.walkInGstin || (viewInvoice.clientId ? "Exempt / Non-Registered" : "Exempt / Non-Registered");
                    const clientMobile = matchedClient?.mobile || viewInvoice.walkInMobile || "";
                    const clientEmail = matchedClient?.email || "";
                    const clientState = matchedClient?.state || "Maharashtra";
                    const stateCode = clientGstin && clientGstin.length >= 2 && !isNaN(Number(clientGstin.substring(0, 2))) 
                      ? clientGstin.substring(0, 2) 
                      : "27";

                    return (
                      <div className="space-y-1.5">
                        <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Billed To (Client Recipient)</span>
                        <h3 className="font-black text-xs text-[#0D2C6C] leading-tight">{viewInvoice.clientName}</h3>
                        <p className="text-slate-500 font-semibold leading-relaxed">
                          Address: {clientAddress || "Office/Corporate premises registered on system."}
                        </p>
                        <div className="space-y-0.5 font-bold text-slate-600">
                          <div>GSTIN/UID: {clientGstin || "Exempt / Non-Registered"}</div>
                          {clientMobile && <div>Mobile: +91 {clientMobile}</div>}
                          {clientEmail && <div>Email: {clientEmail}</div>}
                          <div>State Code: {stateCode} ({clientState})</div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Case / Operations link */}
                  <div className="space-y-1.5 md:text-right">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Compliance Reference linkage</span>
                    <div className="space-y-1 font-bold text-slate-600">
                      <div><span className="text-slate-400">Associated Case Number:</span> {viewInvoice.caseId}</div>
                      <div><span className="text-slate-400">Services Stream:</span> {viewInvoice.serviceName}</div>
                      <div><span className="text-slate-400">Assigned Consultant:</span> Senior Tax & Financial Consultant</div>
                      <div>
                        <span className="text-slate-400">Invoice Status:</span> 
                        <span className="ml-1 text-[#D4AF37] font-black uppercase">{viewInvoice.status}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* 3. Items Table */}
                <div className="py-6 overflow-x-auto">
                  <table className="w-full text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-[9px] font-black uppercase">
                        <th className="p-2.5 border border-slate-200">#</th>
                        <th className="p-2.5 border border-slate-200 w-[40%]">Service Item details</th>
                        <th className="p-2.5 border border-slate-200 text-center">Qty</th>
                        <th className="p-2.5 border border-slate-200 text-right">Rate</th>
                        <th className="p-2.5 border border-slate-200 text-right">Taxable Val</th>
                        <th className="p-2.5 border border-slate-200 text-right">CGST %</th>
                        <th className="p-2.5 border border-slate-200 text-right">SGST %</th>
                        <th className="p-2.5 border border-slate-200 text-right">IGST %</th>
                        <th className="p-2.5 border border-slate-200 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-[10px] font-medium text-slate-700">
                      {viewInvoice.items.map((item, idx) => {
                        const hasIgst = item.igst > 0;
                        return (
                          <tr key={idx}>
                            <td className="p-2.5 border border-slate-200 font-bold">{idx + 1}</td>
                            <td className="p-2.5 border border-slate-200">
                              <div className="font-bold text-slate-800">{item.serviceName}</div>
                              <div className="text-[9px] text-slate-400 font-medium mt-0.5 leading-relaxed">{item.description}</div>
                            </td>
                            <td className="p-2.5 border border-slate-200 text-center font-bold">{item.quantity}</td>
                            <td className="p-2.5 border border-slate-200 text-right font-semibold">₹{item.rate.toLocaleString("en-IN")}</td>
                            <td className="p-2.5 border border-slate-200 text-right font-semibold">₹{item.taxableValue.toLocaleString("en-IN")}</td>
                            <td className="p-2.5 border border-slate-200 text-right font-semibold">
                              {!hasIgst ? `${(item.gstRate / 2)}%` : "-"}
                              <span className="block text-[8px] text-slate-400 font-semibold">{!hasIgst ? `₹${item.cgst.toLocaleString("en-IN")}` : ""}</span>
                            </td>
                            <td className="p-2.5 border border-slate-200 text-right font-semibold">
                              {!hasIgst ? `${(item.gstRate / 2)}%` : "-"}
                              <span className="block text-[8px] text-slate-400 font-semibold">{!hasIgst ? `₹${item.sgst.toLocaleString("en-IN")}` : ""}</span>
                            </td>
                            <td className="p-2.5 border border-slate-200 text-right font-semibold">
                              {hasIgst ? `${item.gstRate}%` : "-"}
                              <span className="block text-[8px] text-slate-400 font-semibold">{hasIgst ? `₹${item.igst.toLocaleString("en-IN")}` : ""}</span>
                            </td>
                            <td className="p-2.5 border border-slate-200 text-right font-black text-slate-800">
                              ₹{item.total.toLocaleString("en-IN")}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Calculations breakdown block */}
                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="p-3 font-bold text-slate-500 text-right uppercase border border-slate-200">Gross Total Base Billed:</td>
                        <td colSpan={2} className="p-3 text-right font-black text-slate-800 border border-slate-200 text-[11px]">
                          ₹{viewInvoice.subTotal.toLocaleString("en-IN")}
                        </td>
                      </tr>

                      {viewInvoice.discountAmount > 0 && (
                        <tr>
                          <td colSpan={7} className="p-3 font-bold text-slate-500 text-right uppercase border border-slate-200 text-rose-600">Discount Reduction:</td>
                          <td colSpan={2} className="p-3 text-right font-black text-rose-600 border border-slate-200 text-[11px]">
                            - ₹{viewInvoice.discountAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}

                      <tr className="bg-slate-50/50">
                        <td colSpan={7} className="p-3 font-bold text-slate-500 text-right uppercase border border-slate-200">Total Taxable Value (Net):</td>
                        <td colSpan={2} className="p-3 text-right font-black text-[#0D2C6C] border border-slate-200 text-[11px]">
                          ₹{viewInvoice.taxableAmount.toLocaleString("en-IN")}
                        </td>
                      </tr>

                      {viewInvoice.cgstAmount > 0 && (
                        <tr>
                          <td colSpan={7} className="p-2 font-bold text-slate-500 text-right uppercase border border-slate-200">Central Tax (CGST):</td>
                          <td colSpan={2} className="p-2 text-right font-bold text-slate-700 border border-slate-200">
                            ₹{viewInvoice.cgstAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}

                      {viewInvoice.sgstAmount > 0 && (
                        <tr>
                          <td colSpan={7} className="p-2 font-bold text-slate-500 text-right uppercase border border-slate-200">State Tax (SGST):</td>
                          <td colSpan={2} className="p-2 text-right font-bold text-slate-700 border border-slate-200">
                            ₹{viewInvoice.sgstAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}

                      {viewInvoice.igstAmount > 0 && (
                        <tr>
                          <td colSpan={7} className="p-2 font-bold text-slate-500 text-right uppercase border border-slate-200">Integrated Tax (IGST):</td>
                          <td colSpan={2} className="p-2 text-right font-bold text-slate-700 border border-slate-200">
                            ₹{viewInvoice.igstAmount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      )}

                      {viewInvoice.roundOff !== 0 && (
                        <tr>
                          <td colSpan={7} className="p-2 font-bold text-slate-400 text-right uppercase border border-slate-200">Rounding Adjustments:</td>
                          <td colSpan={2} className="p-2 text-right text-slate-500 border border-slate-200">
                            ₹{viewInvoice.roundOff.toFixed(2)}
                          </td>
                        </tr>
                      )}

                      <tr className="bg-[#0D2C6C]/5">
                        <td colSpan={7} className="p-4 font-black text-[#0D2C6C] text-right uppercase border border-slate-200 text-xs">Grand Outstanding Total:</td>
                        <td colSpan={2} className="p-4 text-right font-black text-[#0D2C6C] border border-slate-200 text-xs">
                          ₹{viewInvoice.grandTotal.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* 4. Amount in Words */}
                <div className="bg-slate-50 p-4.5 rounded-xl border border-slate-100 text-[10px] text-slate-700 font-bold">
                  <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Amount in Words</span>
                  <span>{viewInvoice.amountInWords}</span>
                </div>

                {/* 5. Payments History Log */}
                {viewInvoice.payments.length > 0 && (
                  <div className="py-4 space-y-2 text-[10px]">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Payment Receipts Allocation Log</span>
                    <div className="space-y-1.5">
                      {viewInvoice.payments.map((pay, pIdx) => (
                        <div key={pIdx} className="bg-emerald-50/40 p-2.5 rounded-xl border border-emerald-100/70 flex justify-between items-center text-emerald-800">
                          <div>
                            <span className="font-bold">Receipt #{pay.id}</span>
                            <span className="mx-1.5 font-medium">• logged via [{pay.mode}] on {pay.date}</span>
                            {pay.transactionRef && <span className="block text-[8px] font-mono mt-0.5 text-emerald-600">Ref: {pay.transactionRef}</span>}
                          </div>
                          <span className="font-black text-xs">₹{pay.amount.toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Footer Bank details and Signatures stamp */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-200 items-start text-[10px]">
                  
                  {/* Bank detail cards */}
                  <div className="space-y-2">
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Official Practice Bank Details</span>
                    <div className="bg-slate-50/50 p-3.5 border border-slate-100 rounded-xl space-y-1.5 text-slate-600 font-bold">
                      <div>Bank Name: <span className="text-slate-800">AU SMALL FINANCE BANK</span></div>
                      <div>Beneficiary: <span className="text-slate-800">JAIN AGARWAL & CO</span></div>
                      <div>Account No: <span className="text-slate-800 font-mono">2121245232324709</span></div>
                      <div>IFSC Code: <span className="text-slate-800 font-mono">AUBL0002452</span></div>
                      <div>Branch Name: <span className="text-slate-800">Kharghar Mumbai</span></div>
                      <div>UPI / GPay / PhonePe: <span className="text-slate-800 font-mono">8828147889@okbizaxis</span></div>
                    </div>
                  </div>

                  {/* Payment QR Code */}
                  <div className="space-y-2 flex flex-col items-center justify-center border-y md:border-y-0 md:border-l md:border-r border-slate-100 py-4 md:py-0 px-4">
                    <span className="block text-[8px] font-black text-[#0D2C6C] uppercase tracking-widest text-center">Scan to Pay (GPay/PhonePe/Paytm)</span>
                    <div className="bg-white p-2 border border-[#D4AF37]/30 rounded-xl shadow-sm flex flex-col items-center justify-center mt-1">
                      <QRCodeSVG 
                        value={`upi://pay?pa=8828147889@okbizaxis&pn=JAIN%20AGARWAL%20%26%20CO&am=${viewInvoice.grandTotal}&cu=INR&tn=Invoice%20${viewInvoice.id}`}
                        size={100}
                        level="M"
                      />
                      <span className="text-[7.5px] text-slate-500 font-bold mt-1.5 text-center">GPay/UPI ID: 8828147889@okbizaxis</span>
                    </div>
                  </div>

                  {/* Stamp & Authorized signature or Computer-generated disclaimer */}
                  <div className="flex flex-col items-center md:items-end justify-between h-full space-y-4">
                    
                    {/* Security Authentication Badge */}
                    <div className="flex items-center gap-1.5 text-[8px] text-[#D4AF37] bg-[#0D2C6C]/5 border border-[#D4AF37]/20 px-2 py-1 rounded-md font-bold self-center md:self-end">
                      <Shield className="w-3 h-3 text-[#D4AF37]" />
                      <span>Digitally Verified & Authenticated</span>
                    </div>

                    <div className="text-center md:text-right space-y-1.5 pt-4 flex flex-col items-center md:items-end">
                      {/* Secure QR Code Seal */}
                      {viewInvoice && (
                        <div className="mb-2 p-1.5 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col items-center justify-center">
                          <QRCodeSVG 
                            value={`--- JAIN AGARWAL & CO. OFFICIAL TAX INVOICE VERIFICATION ---
Invoice Ref: ${viewInvoice.id}
Issue Date: ${viewInvoice.date}
Grand Total: ₹${viewInvoice.grandTotal.toLocaleString("en-IN")}
Client: ${viewInvoice.clientName}
Status: DIGITALLY SIGNED & VERIFIED
Tamper-Proof Seal: ${generateHashSync(`${viewInvoice.id}|${viewInvoice.date}|${viewInvoice.grandTotal}|${viewInvoice.clientName}|MyFirmSecureKey2026!`)}
Verification Registry: https://www.jainnagarwal.in/verify?ref=${viewInvoice.id}&seal=${generateHashSync(`${viewInvoice.id}|${viewInvoice.date}|${viewInvoice.grandTotal}|${viewInvoice.clientName}|MyFirmSecureKey2026!`)}`}
                            size={72}
                            level="M"
                          />
                          <div className="text-[6px] text-slate-400 font-mono mt-1 select-all">
                            SEAL: {generateHashSync(`${viewInvoice.id}|${viewInvoice.date}|${viewInvoice.grandTotal}|${viewInvoice.clientName}|MyFirmSecureKey2026!`).substring(0, 8).toUpperCase()}
                          </div>
                        </div>
                      )}

                      <div className="h-10 w-32 border-b border-dashed border-slate-300 mx-auto md:ml-auto"></div>
                      <span className="block text-[9px] font-black text-[#0D2C6C] uppercase tracking-wider">Jain Agarwal & Co.</span>
                      <span className="block text-[8px] text-slate-400 font-bold">Authorized Signatory Stamp</span>
                    </div>

                  </div>

                </div>

                {/* T&C Declarations */}
                <div className="pt-6 border-t border-slate-100 text-[8px] text-slate-400 space-y-1">
                  <strong className="block text-slate-500">Terms & Conditions / Declarations:</strong>
                  <div>1. Payment due within agreed terms. Delayed payments are subject to 18% p.a. interest as per practice standards.</div>
                  <div>2. All disputes are subject to the exclusive jurisdiction of Thane Courts, Maharashtra.</div>
                  <div className="font-bold text-slate-500">This is a computer-generated, digitally authenticated document and does not require physical signatures.</div>
                </div>

              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </WorkspaceLayout>
  );
}
