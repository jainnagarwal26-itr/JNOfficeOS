/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion } from "motion/react";
import { 
  Settings2, Building2, CreditCard, Receipt, FileText, Check, AlertTriangle, 
  HelpCircle, Upload, Save, Eye, ShieldAlert, Plus, Trash
} from "lucide-react";
import { User, FirmSettings, BankDetails } from "../types";
import { getSettings, saveSettings } from "../lib/db";

interface SettingsPanelProps {
  currentUser: User;
  settings: FirmSettings;
  onUpdateSettings: (newSettings: FirmSettings) => void;
  onAddAuditLog: (action: string, category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM", details: string) => void;
}

export default function SettingsPanel({ 
  currentUser: rawCurrentUser, 
  settings: initialSettings, 
  onUpdateSettings,
  onAddAuditLog
}: SettingsPanelProps) {
  const isSuperAdminOrOwner = rawCurrentUser.role === "OWNER" || 
    String(rawCurrentUser.role).toLowerCase() === "superadmin" || 
    String(rawCurrentUser.role).toLowerCase() === "super_admin" || 
    String(rawCurrentUser.role).toLowerCase() === "super admin";

  const currentUser = {
    ...rawCurrentUser,
    role: isSuperAdminOrOwner ? ("OWNER" as any) : rawCurrentUser.role
  };

  const [settings, setSettings] = useState<FirmSettings>(initialSettings);
  const [activeSubTab, setActiveSubTab] = useState<"FIRM" | "BANK" | "INVOICE" | "SECURITY">("FIRM");
  const [isSaved, setIsSaved] = useState(false);
  
  // Local states for complex items (terms & conditions editor)
  const [newTerm, setNewTerm] = useState("");
  const [signaturePreview, setSignaturePreview] = useState<string | null>(initialSettings.signatureImage);

  const handleInputChange = (field: keyof FirmSettings, value: any) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value
    }));
    setIsSaved(false);
  };

  const handleBankChange = (field: keyof BankDetails, value: string) => {
    setSettings((prev) => ({
      ...prev,
      bankDetails: {
        ...prev.bankDetails,
        [field]: value
      }
    }));
    setIsSaved(false);
  };

  const handleAddTerm = () => {
    if (!newTerm.trim()) return;
    const updatedTerms = [...settings.termsAndConditions, newTerm.trim()];
    handleInputChange("termsAndConditions", updatedTerms);
    setNewTerm("");
  };

  const handleRemoveTerm = (index: number) => {
    const updatedTerms = settings.termsAndConditions.filter((_, i) => i !== index);
    handleInputChange("termsAndConditions", updatedTerms);
  };

  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setSignaturePreview(base64);
      handleInputChange("signatureImage", base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // Permissions bypass checks - Only OWNER can update active settings
    if (currentUser.role !== "OWNER") {
      alert("Permission Denied: Only designated Owners can edit Practice Management settings.");
      return;
    }

    const confirm = window.confirm(
      "Confirm System Configuration Update:\nAre you sure you want to write these settings to the master database? Some updates may immediately affect raised invoices and system timeouts."
    );
    if (!confirm) return;

    // Persist
    saveSettings(settings);
    onUpdateSettings(settings);

    // Write audit ledger
    onAddAuditLog(
      "SETTINGS_UPDATED",
      "SETTINGS",
      `Practice parameters and system settings modified by ${currentUser.email}.`
    );

    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-6">
      
      {/* Settings Title Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="font-display font-semibold text-[#0D2C6C] text-lg tracking-tight flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-[#D4AF37]" />
            Practice Console & Settings
          </h2>
          <p className="text-xs text-slate-400 font-sans mt-0.5">
            Configure Jain Agarwal & Co. firm metadata, digital signatory authorizations, print invoices, and payment coordinate details.
          </p>
        </div>

        {currentUser.role !== "OWNER" && (
          <div className="p-2 bg-red-50 text-red-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-red-100">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            Owner Permissions Required to Save
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand Navigation Subtabs */}
        <div className="lg:col-span-3 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-1 self-start">
          <button
            onClick={() => setActiveSubTab("FIRM")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
              activeSubTab === "FIRM"
                ? "bg-blue-50 text-[#0D2C6C] border-l-4 border-[#0D2C6C]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Firm Identity Setup
          </button>

          <button
            onClick={() => setActiveSubTab("BANK")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
              activeSubTab === "BANK"
                ? "bg-blue-50 text-[#0D2C6C] border-l-4 border-[#0D2C6C]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Bank & UPI Records
          </button>

          <button
            onClick={() => setActiveSubTab("INVOICE")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
              activeSubTab === "INVOICE"
                ? "bg-blue-50 text-[#0D2C6C] border-l-4 border-[#0D2C6C]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Receipt className="w-4 h-4" />
            Invoice Templates & T&C
          </button>

          <button
            onClick={() => setActiveSubTab("SECURITY")}
            className={`w-full text-left px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${
              activeSubTab === "SECURITY"
                ? "bg-blue-50 text-[#0D2C6C] border-l-4 border-[#0D2C6C]"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            Inactivity & Vaults
          </button>
        </div>

        {/* Right Hand Settings Workspace Form */}
        <div className="lg:col-span-9">
          <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col justify-between min-h-[450px]">
            
            {/* Form Fields Area */}
            <div className="p-6 md:p-8 space-y-6">
              
              {activeSubTab === "FIRM" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-semibold text-[#0D2C6C] text-sm">Firm Identity & Branding</h3>
                    <p className="text-[11px] text-slate-400 font-sans">Establish organizational headers used in dashboards and printable documents.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Registered Firm Name</label>
                      <input
                        type="text"
                        value={settings.firmName}
                        onChange={(e) => handleInputChange("firmName", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C]"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Official Slogan / Tagline</label>
                      <input
                        type="text"
                        value={settings.tagline}
                        onChange={(e) => handleInputChange("tagline", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C]"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Support Contact Phone</label>
                      <input
                        type="text"
                        value={settings.phone}
                        onChange={(e) => handleInputChange("phone", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C]"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Client Relations Email</label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => handleInputChange("email", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C]"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Office Correspondence Address</label>
                      <textarea
                        value={settings.address}
                        onChange={(e) => handleInputChange("address", e.target.value)}
                        rows={2}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none focus:border-[#0D2C6C] font-sans resize-none"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "BANK" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-semibold text-[#0D2C6C] text-sm">Corporate Bank Records</h3>
                    <p className="text-[11px] text-slate-400 font-sans">Payment receiving bank and UPI details integrated directly inside invoices and receipts.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Bank Name</label>
                      <input
                        type="text"
                        value={settings.bankDetails.bankName}
                        onChange={(e) => handleBankChange("bankName", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Number</label>
                      <input
                        type="text"
                        value={settings.bankDetails.accountNo}
                        onChange={(e) => handleBankChange("accountNo", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none font-mono"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">IFSC Code Code</label>
                      <input
                        type="text"
                        value={settings.bankDetails.ifscCode}
                        onChange={(e) => handleBankChange("ifscCode", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none font-mono"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Branch Name & Town</label>
                      <input
                        type="text"
                        value={settings.bankDetails.branchName}
                        onChange={(e) => handleBankChange("branchName", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Account Holder Name</label>
                      <input
                        type="text"
                        value={settings.bankDetails.accountHolderName}
                        onChange={(e) => handleBankChange("accountHolderName", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">UPI ID Reference</label>
                      <input
                        type="text"
                        value={settings.bankDetails.upiId}
                        onChange={(e) => handleBankChange("upiId", e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none font-mono"
                        required
                        disabled={currentUser.role !== "OWNER"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeSubTab === "INVOICE" && (
                <div className="space-y-6">
                  
                  {/* Part 1: Invoice Format Prefix */}
                  <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="font-display font-semibold text-[#0D2C6C] text-sm">Invoice Structure</h3>
                      <p className="text-[11px] text-slate-400 font-sans">Define auto-increment and prefix parameters for print-ready invoice numbers.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Invoice Series Prefix</label>
                        <input
                          type="text"
                          value={settings.invoicePrefix}
                          onChange={(e) => handleInputChange("invoicePrefix", e.target.value)}
                          placeholder="e.g. JNA/2026-27/"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs focus:outline-none font-mono"
                          required
                          disabled={currentUser.role !== "OWNER"}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Next Invoice Serial ID</label>
                        <input
                          type="number"
                          value={settings.invoiceNextNumber}
                          onChange={(e) => handleInputChange("invoiceNextNumber", parseInt(e.target.value, 10))}
                          className="w-full px-3 py-2 border border-[#D4AF37]/40 rounded-lg text-xs focus:outline-none font-mono font-bold bg-amber-50/10 text-[#0D2C6C]"
                          required
                          disabled={currentUser.role !== "OWNER"}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Part 2: Terms & Conditions editor */}
                  <div className="space-y-3">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Practice Terms & Conditions</label>
                    
                    {currentUser.role === "OWNER" && (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newTerm}
                          onChange={(e) => setNewTerm(e.target.value)}
                          placeholder="Add new custom business term or fine print clause..."
                          className="flex-grow px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleAddTerm}
                          className="bg-[#0D2C6C] text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 cursor-pointer font-semibold shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Clause
                        </button>
                      </div>
                    )}

                    <div className="border border-slate-100 rounded-xl divide-y divide-slate-100 overflow-hidden bg-slate-50/50">
                      {settings.termsAndConditions.map((term, i) => (
                        <div key={i} className="p-3 text-xs text-slate-600 flex justify-between gap-3 items-center">
                          <p className="font-sans leading-relaxed flex-grow">{i + 1}. {term}</p>
                          {currentUser.role === "OWNER" && (
                            <button
                              type="button"
                              onClick={() => handleRemoveTerm(i)}
                              className="text-red-500 hover:text-red-700 p-1 cursor-pointer"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Signature Section */}
                  <div className="space-y-4 pt-2">
                    <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider">Authorized Digital Signature</label>
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-8 space-y-2">
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Provide a clear, cropped PNG/JPG scan of CA. Jain Agarwal's digital signature. Valid signatures render on verified invoices automatically.
                        </p>
                        
                        {currentUser.role === "OWNER" && (
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleSignatureUpload}
                              className="hidden"
                              id="signature_file_upload"
                            />
                            <label
                              htmlFor="signature_file_upload"
                              className="inline-flex items-center gap-1.5 border border-[#0D2C6C] border-dashed hover:bg-blue-50/30 text-[#0D2C6C] font-semibold text-xs px-3.5 py-2 rounded-lg cursor-pointer transition-colors"
                            >
                              <Upload className="w-4 h-4" />
                              Upload New Signature Image
                            </label>
                          </div>
                        )}
                      </div>

                      <div className="md:col-span-4 flex justify-center bg-slate-50 rounded-xl p-3 border border-slate-100 min-h-[100px] items-center relative overflow-hidden">
                        {signaturePreview ? (
                          <div className="relative group w-full text-center">
                            <img src={signaturePreview} alt="Digital Signatory" className="max-h-20 object-contain mx-auto mix-blend-darken" />
                            <span className="block text-[8px] text-slate-400 mt-1 uppercase font-mono tracking-wider">Authorized Signature</span>
                          </div>
                        ) : (
                          <div className="text-center text-slate-400 text-[10px] space-y-1">
                            <FileText className="w-5 h-5 mx-auto text-slate-300" />
                            <span>No scan provided</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              )}

              {activeSubTab === "SECURITY" && (
                <div className="space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-display font-semibold text-[#0D2C6C] text-sm">Workspace Security Logs</h3>
                    <p className="text-[11px] text-slate-400 font-sans">Administer session timers and data security thresholds for practice operators.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">Inactivity Logout Timer</label>
                      <select
                        value={settings.sessionTimeoutMinutes}
                        onChange={(e) => handleInputChange("sessionTimeoutMinutes", parseInt(e.target.value, 10))}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-[#0D2C6C] bg-white"
                        disabled={currentUser.role !== "OWNER"}
                      >
                        <option value={5}>5 Minutes Inactivity</option>
                        <option value={15}>15 Minutes Inactivity (Standard)</option>
                        <option value={30}>30 Minutes Inactivity</option>
                        <option value={60}>60 Minutes Inactivity</option>
                      </select>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 md:col-span-2 space-y-1">
                      <span className="block font-bold text-[10px] text-[#0D2C6C] uppercase tracking-wider">Secure Document Vault Guard</span>
                      <p className="text-[11px] text-slate-500 leading-normal">
                        JN OfficeOS integrates with Google Drive. Uploaded documents (audits, client PANs, loan files) are locked securely in individual client folders inside the Google Drive of Jain Agarwal & Co. Direct manual download from standard folder structures requires dynamic Owner validation.
                      </p>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Sticky Action Footer */}
            <div className="p-4 md:px-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-[10px] text-slate-400 font-mono">
                Thane Maharashtra Jurisdiction • Authorized Signatory Core
              </span>

              {currentUser.role === "OWNER" ? (
                <div className="flex items-center gap-2">
                  {isSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xs font-bold text-emerald-600 flex items-center gap-1 pr-1"
                    >
                      <Check className="w-4 h-4" />
                      Configurations Persisted!
                    </motion.span>
                  )}
                  
                  <button
                    type="submit"
                    className="bg-[#0D2C6C] hover:bg-[#071D4A] text-white text-xs font-semibold px-4.5 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.99] transition-all"
                  >
                    <Save className="w-4 h-4" />
                    Write Parameters
                  </button>
                </div>
              ) : (
                <div className="text-[11px] text-red-600 font-bold bg-red-50 px-2.5 py-1 rounded border border-red-100">
                  Read-Only Mode
                </div>
              )}
            </div>

          </form>
        </div>

      </div>

    </div>
  );
}
