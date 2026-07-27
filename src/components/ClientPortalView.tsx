/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Building2, User, FileText, CheckCircle2, AlertCircle, Clock, ShieldCheck, 
  Download, Eye, Plus, Send, Calendar, MessageSquare, Sparkles, LogOut, 
  RefreshCw, Cpu, CreditCard, DollarSign, HelpCircle, FileCheck, ArrowRight, X, Phone, Mail, MapPin, Search
} from "lucide-react";
import { ClientDashboardData, ClientRequest, ClientAppointment, ClientPortalMessage } from "../types/clientPortal";
import { ClientDashboardService } from "../lib/clientDashboardService";
import { ClientPortalRepository } from "../lib/clientPortalRepository";
import { OCRService } from "../lib/ocrService";
import { aiService } from "../lib/aiService";
import { getClients } from "../lib/db";

interface ClientPortalViewProps {
  initialClientId?: string;
  onLogout?: () => void;
}

export default function ClientPortalView({ initialClientId = "CL000001", onLogout }: ClientPortalViewProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [dashboardData, setDashboardData] = useState<ClientDashboardData | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "documents" | "finance" | "requests" | "appointments" | "ai_assistant">("overview");

  // Requests Modal
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [reqSubject, setReqSubject] = useState("");
  const [reqType, setReqType] = useState<ClientRequest["requestType"]>("ITR_FILING");
  const [reqDescription, setReqDescription] = useState("");

  // Appointments Modal
  const [isAppointmentOpen, setIsAppointmentOpen] = useState(false);
  const [appSubject, setAppSubject] = useState("");
  const [appDate, setAppDate] = useState("");
  const [appNotes, setAppNotes] = useState("");

  // AI Assistant Chat State
  const [aiMessage, setAiMessage] = useState("");
  const [aiChatHistory, setAiChatHistory] = useState<Array<{ role: "user" | "model"; content: string }>>([
    { role: "model", content: "Hello! I am your JN OfficeOS AI Compliance Assistant. How can I assist you with your taxes, documents, or outstanding invoices today?" }
  ]);
  const [isAiThinking, setIsAiThinking] = useState(false);

  // Toast
  const [toast, setToast] = useState<string | null>(null);

  const availableClients = getClients();

  useEffect(() => {
    loadDashboard();
  }, [selectedClientId]);

  const loadDashboard = async () => {
    const data = await ClientDashboardService.getClientDashboardData(selectedClientId);
    setDashboardData(data);
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Submit New Service Request / Ticket
  const handleCreateRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reqSubject || !reqDescription) return;

    const newReq: ClientRequest = {
      id: `req_${Date.now()}`,
      requestId: `REQ/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: selectedClientId,
      requestType: reqType,
      subject: reqSubject,
      description: reqDescription,
      priority: "MEDIUM",
      status: "OPEN",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await ClientPortalRepository.createRequest(newReq);
    setIsNewRequestOpen(false);
    setReqSubject("");
    setReqDescription("");
    showToast("Service request logged successfully!");
    loadDashboard();
  };

  // Schedule Appointment Submit
  const handleScheduleAppointmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appSubject || !appDate) return;

    const newApp: ClientAppointment = {
      id: `app_${Date.now()}`,
      appointmentId: `APP/${new Date().getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: selectedClientId,
      subject: appSubject,
      scheduledAt: new Date(appDate).toISOString(),
      durationMins: 30,
      status: "SCHEDULED",
      meetingLink: "https://meet.google.com/jno-office-ca",
      notes: appNotes,
      createdAt: new Date().toISOString()
    };

    await ClientPortalRepository.createAppointment(newApp);
    setIsAppointmentOpen(false);
    setAppSubject("");
    setAppDate("");
    setAppNotes("");
    showToast("CA Consultation appointment scheduled successfully!");
    loadDashboard();
  };

  // AI Assistant Query Handler
  const handleSendAiMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiMessage.trim()) return;

    const userText = aiMessage;
    setAiMessage("");
    setAiChatHistory(prev => [...prev, { role: "user", content: userText }]);
    setIsAiThinking(true);

    try {
      const response = await aiService.askAssistant({
        prompt: userText,
        systemContext: `Client Context: ${dashboardData?.clientName} (PAN: ${dashboardData?.pan}, GSTIN: ${dashboardData?.gstin}). Outstanding Balance: ₹${dashboardData?.outstandingBalance}.`
      });

      setAiChatHistory(prev => [...prev, { role: "model", content: response.content }]);
    } catch (err: any) {
      setAiChatHistory(prev => [...prev, { role: "model", content: "I apologize, I encountered an issue retrieving compliance details. Please try again." }]);
    } finally {
      setIsAiThinking(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-800 flex flex-col">
      
      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50 bg-[#0D2C6C] text-white px-4 py-2.5 rounded-xl shadow-xl font-bold text-xs flex items-center gap-2 border border-[#D4AF37]"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navbar */}
      <header className="bg-[#0D2C6C] text-white p-4 px-6 flex justify-between items-center shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-[#D4AF37]/40 shadow-sm">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="font-display font-black text-sm uppercase tracking-tight text-white">Jain Agarwal & Co.</h1>
            <p className="text-[9px] text-[#D4AF37] font-bold uppercase tracking-widest">Enterprise Client Self-Service Workspace</p>
          </div>
        </div>

        {/* Client Switcher & Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white/10 p-1.5 px-3 rounded-xl border border-white/20 text-xs">
            <User className="w-3.5 h-3.5 text-[#D4AF37]" />
            <select 
              value={selectedClientId} 
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-transparent text-white font-bold cursor-pointer focus:outline-none"
            >
              {availableClients.map(c => (
                <option key={c.id} value={c.id} className="text-slate-800 font-bold">{c.name} ({c.id})</option>
              ))}
            </select>
          </div>

          {onLogout && (
            <button 
              onClick={onLogout}
              className="p-2 bg-rose-500/20 hover:bg-rose-500/40 text-rose-200 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              Exit Portal
            </button>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-grow p-6 max-w-7xl w-full mx-auto space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
          {[
            { id: "overview", label: "Dashboard Overview", icon: Building2 },
            { id: "documents", label: "Document Center & OCR", icon: FileText },
            { id: "finance", label: "Finance & Invoices", icon: CreditCard },
            { id: "requests", label: "Service Requests", icon: MessageSquare },
            { id: "appointments", label: "Schedule Appointment", icon: Calendar },
            { id: "ai_assistant", label: "Firm AI Assistant", icon: Sparkles }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer whitespace-nowrap ${
                  isActive ? "bg-[#0D2C6C] text-white shadow-md" : "bg-white text-slate-600 hover:bg-slate-200/70 border border-slate-200"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[#D4AF37]" : "text-slate-500"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* TAB 1: DASHBOARD OVERVIEW */}
        {activeTab === "overview" && dashboardData && (
          <div className="space-y-6">
            
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-[#0D2C6C] to-[#1E40AF] text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-[#D4AF37] uppercase tracking-widest block">Client Workspace Active</span>
                <h2 className="text-xl font-display font-black tracking-tight">{dashboardData.clientName}</h2>
                <p className="text-xs text-blue-200">PAN: <span className="font-mono font-bold">{dashboardData.pan || "N/A"}</span> | GSTIN: <span className="font-mono font-bold">{dashboardData.gstin || "N/A"}</span></p>
              </div>

              <div className="bg-white/10 p-3 px-4 rounded-xl border border-white/20 text-center">
                <span className="text-[9px] text-slate-300 uppercase tracking-widest font-bold block">Outstanding Balance</span>
                <span className="text-lg font-black text-[#D4AF37]">₹{dashboardData.outstandingBalance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Billed</span>
                <span className="text-base font-black text-slate-800">₹{dashboardData.totalBilled.toLocaleString("en-IN")}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Received</span>
                <span className="text-base font-black text-emerald-600">₹{dashboardData.totalPaid.toLocaleString("en-IN")}</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Documents</span>
                <span className="text-base font-black text-[#0D2C6C]">{dashboardData.activeDocumentsCount} Docs</span>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Open Tickets</span>
                <span className="text-base font-black text-amber-600">{dashboardData.pendingTasksCount} Pending</span>
              </div>
            </div>

            {/* Invoices & Documents Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Recent Invoices */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Recent Tax Invoices</h3>
                  <button onClick={() => setActiveTab("finance")} className="text-[10px] font-bold text-[#0D2C6C] hover:underline">View All</button>
                </div>

                {dashboardData.recentInvoices.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No recent invoices logged.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.recentInvoices.map((inv, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-mono font-bold text-[#0D2C6C] block">{inv.id}</span>
                          <span className="text-[10px] text-slate-400">{inv.serviceName} • {inv.date}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-black text-slate-800 block">₹{inv.grandTotal.toLocaleString("en-IN")}</span>
                          <span className={`text-[9px] font-bold uppercase ${inv.status === "Paid" ? "text-emerald-600" : "text-amber-600"}`}>{inv.status}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Documents & OCR Status */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Document Vault & OCR Integrity</h3>
                  <button onClick={() => setActiveTab("documents")} className="text-[10px] font-bold text-[#0D2C6C] hover:underline">View All</button>
                </div>

                {dashboardData.recentDocuments.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No documents uploaded yet.</p>
                ) : (
                  <div className="space-y-2">
                    {dashboardData.recentDocuments.map((doc, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block">{doc.name}</span>
                          <span className="text-[10px] text-slate-400">{doc.category} • V{doc.currentVersion}</span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[9px]">
                          OCR Verified
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: DOCUMENT CENTER & OCR STATUS */}
        {activeTab === "documents" && dashboardData && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-black text-sm text-[#0D2C6C] uppercase tracking-wider">Client Document Vault & OCR Processing</h3>
                <p className="text-xs text-slate-400">All compliance documents uploaded for {dashboardData.clientName}</p>
              </div>
            </div>

            {dashboardData.recentDocuments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No documents available in vault.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-200">
                      <th className="p-3">Ref ID</th>
                      <th className="p-3">Document Name</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Version</th>
                      <th className="p-3 text-center">OCR Status</th>
                      <th className="p-3 text-right">Verification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dashboardData.recentDocuments.map((doc, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono text-slate-500 font-bold">{doc.id}</td>
                        <td className="p-3 font-bold text-[#0D2C6C]">{doc.name}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">{doc.category}</span>
                        </td>
                        <td className="p-3 font-bold">V{doc.currentVersion}</td>
                        <td className="p-3 text-center">
                          <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-bold text-[10px] border border-emerald-200">
                            COMPLETED (98.5%)
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-[10px] border border-blue-200">
                            {doc.verification?.status || "Verified"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: FINANCE & INVOICES */}
        {activeTab === "finance" && dashboardData && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-black text-sm text-[#0D2C6C] uppercase tracking-wider">Financial Invoices & Payment Ledger</h3>
                <p className="text-xs text-slate-400">Statement of accounts for {dashboardData.clientName}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 block uppercase">Outstanding Net</span>
                <span className="text-sm font-black text-[#D4AF37]">₹{dashboardData.outstandingBalance.toLocaleString("en-IN")}</span>
              </div>
            </div>

            {dashboardData.recentInvoices.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No invoices found for this client.</p>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs text-slate-700 border-collapse">
                  <thead>
                    <tr className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase border-b border-slate-200">
                      <th className="p-3">Invoice Ref</th>
                      <th className="p-3">Issue Date</th>
                      <th className="p-3">Service Description</th>
                      <th className="p-3 text-right">Grand Total</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {dashboardData.recentInvoices.map((inv, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3 font-mono font-bold text-[#0D2C6C]">{inv.id}</td>
                        <td className="p-3">{inv.date}</td>
                        <td className="p-3 font-bold text-slate-800">{inv.serviceName}</td>
                        <td className="p-3 text-right font-black text-slate-800">₹{inv.grandTotal.toLocaleString("en-IN")}</td>
                        <td className="p-3 text-right">
                          <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                            {inv.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: SERVICE REQUESTS */}
        {activeTab === "requests" && dashboardData && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-black text-sm text-[#0D2C6C] uppercase tracking-wider">Service Tickets & Compliance Queries</h3>
                <p className="text-xs text-slate-400">Log requests for ITR, GST, or Loan documentation</p>
              </div>
              <button 
                onClick={() => setIsNewRequestOpen(true)}
                className="bg-[#0D2C6C] hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4 text-[#D4AF37]" />
                Log New Request
              </button>
            </div>

            {dashboardData.recentRequests.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No service requests logged yet.</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.recentRequests.map((req, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-[10px] font-bold text-[#0D2C6C]">{req.requestId}</span>
                        <h4 className="font-bold text-sm text-slate-800">{req.subject}</h4>
                      </div>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px] uppercase">{req.status}</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: APPOINTMENTS */}
        {activeTab === "appointments" && dashboardData && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h3 className="font-display font-black text-sm text-[#0D2C6C] uppercase tracking-wider">CA Consultation Appointments</h3>
                <p className="text-xs text-slate-400">Schedule one-on-one virtual consultations with senior tax partners</p>
              </div>
              <button 
                onClick={() => setIsAppointmentOpen(true)}
                className="bg-[#0D2C6C] hover:bg-blue-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow"
              >
                <Calendar className="w-4 h-4 text-[#D4AF37]" />
                Book Consultation
              </button>
            </div>

            {dashboardData.upcomingAppointments.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">No upcoming consultation appointments.</p>
            ) : (
              <div className="space-y-3">
                {dashboardData.upcomingAppointments.map((app, idx) => (
                  <div key={idx} className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex justify-between items-center text-xs">
                    <div>
                      <span className="font-mono text-[10px] font-bold text-[#0D2C6C] block">{app.appointmentId}</span>
                      <h4 className="font-bold text-slate-800 text-sm">{app.subject}</h4>
                      <span className="text-slate-500 font-medium">Scheduled for: {new Date(app.scheduledAt).toLocaleString()}</span>
                    </div>
                    <a 
                      href={app.meetingLink} 
                      target="_blank" 
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-[#0D2C6C] text-white rounded-lg font-bold text-[10px] hover:bg-blue-900 transition-colors"
                    >
                      Join Google Meet
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: AI ASSISTANT CHAT */}
        {activeTab === "ai_assistant" && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="bg-[#0D2C6C] p-4 text-white flex items-center gap-2 border-b border-blue-900 shrink-0">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <div>
                <h3 className="font-display font-bold text-xs uppercase tracking-wider">Practice AI Compliance Assistant</h3>
                <p className="text-[10px] text-blue-200">Contextual answers for your compliance, documents, and tax filings</p>
              </div>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-grow bg-slate-50/50">
              {aiChatHistory.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-xl p-3.5 rounded-2xl text-xs font-medium leading-relaxed ${
                    msg.role === "user" ? "bg-[#0D2C6C] text-white rounded-br-none" : "bg-white border border-slate-200 text-slate-800 rounded-bl-none shadow-sm"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))}

              {isAiThinking && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-200 p-3 rounded-2xl text-xs text-slate-500 font-bold flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#0D2C6C]" />
                    Analyzing client compliance context...
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleSendAiMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2 shrink-0">
              <input
                type="text"
                value={aiMessage}
                onChange={(e) => setAiMessage(e.target.value)}
                placeholder="Ask about your GST, ITR, document status, or tax advice..."
                className="flex-grow px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-[#0D2C6C]"
              />
              <button
                type="submit"
                disabled={isAiThinking}
                className="bg-[#0D2C6C] hover:bg-blue-900 disabled:opacity-50 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow cursor-pointer flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                Ask
              </button>
            </form>
          </div>
        )}

      </div>

      {/* NEW REQUEST MODAL */}
      <AnimatePresence>
        {isNewRequestOpen && (
          <div className="fixed inset-0 bg-[#0A1C40]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="bg-[#0D2C6C] p-4 text-white flex justify-between items-center">
                <span className="font-bold text-xs uppercase">Log Compliance Ticket</span>
                <button onClick={() => setIsNewRequestOpen(false)}><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleCreateRequestSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Request Category</label>
                  <select value={reqType} onChange={(e) => setReqType(e.target.value as any)} className="w-full p-2 border border-slate-200 rounded-xl">
                    <option value="ITR_FILING">Income Tax Return Filing</option>
                    <option value="GST_COMPLIANCE">GST Filing / Compliance</option>
                    <option value="LOAN_DOCUMENTS">Loan Documentation Support</option>
                    <option value="COMPLIANCE_QUERY">General Compliance Query</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Subject</label>
                  <input type="text" value={reqSubject} onChange={(e) => setReqSubject(e.target.value)} required placeholder="e.g. Need Form 26AS Reconciliation" className="w-full p-2 border border-slate-200 rounded-xl" />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Detailed Requirements</label>
                  <textarea rows={3} value={reqDescription} onChange={(e) => setReqDescription(e.target.value)} required placeholder="Provide details..." className="w-full p-2 border border-slate-200 rounded-xl" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsNewRequestOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0D2C6C] text-white font-bold rounded-xl shadow">Submit Request</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* APPOINTMENT BOOKING MODAL */}
      <AnimatePresence>
        {isAppointmentOpen && (
          <div className="fixed inset-0 bg-[#0A1C40]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden">
              <div className="bg-[#0D2C6C] p-4 text-white flex justify-between items-center">
                <span className="font-bold text-xs uppercase">Book CA Consultation</span>
                <button onClick={() => setIsAppointmentOpen(false)}><X className="w-4 h-4" /></button>
              </div>

              <form onSubmit={handleScheduleAppointmentSubmit} className="p-6 space-y-4 text-xs">
                <div>
                  <label className="font-bold text-slate-500 block mb-1">Consultation Agenda</label>
                  <input type="text" value={appSubject} onChange={(e) => setAppSubject(e.target.value)} required placeholder="e.g. Tax Planning & Audit Discussion" className="w-full p-2 border border-slate-200 rounded-xl" />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Preferred Date & Time</label>
                  <input type="datetime-local" value={appDate} onChange={(e) => setAppDate(e.target.value)} required className="w-full p-2 border border-slate-200 rounded-xl" />
                </div>

                <div>
                  <label className="font-bold text-slate-500 block mb-1">Additional Notes</label>
                  <textarea rows={2} value={appNotes} onChange={(e) => setAppNotes(e.target.value)} placeholder="Notes for the partner..." className="w-full p-2 border border-slate-200 rounded-xl" />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setIsAppointmentOpen(false)} className="px-4 py-2 border border-slate-200 rounded-xl font-bold">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-[#0D2C6C] text-white font-bold rounded-xl shadow">Schedule Consultation</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
