/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { ConfigurationRepository, CompanyDetails, OfficeSettingsConfig } from "../../lib/configurationRepositories";
import { Building, Save, Clock, HelpCircle, Shield, Plus, Trash2 } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const CompanyOfficeStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [company, setCompany] = useState<CompanyDetails>(() => ConfigurationRepository.getCompanyDetails());
  const [office, setOffice] = useState<OfficeSettingsConfig>(() => ConfigurationRepository.getOfficeSettings());
  const [newHolidayName, setNewHolidayName] = useState("");
  const [newHolidayDate, setNewHolidayDate] = useState("");

  const handleSaveCompany = () => {
    try {
      ConfigurationRepository.updateCompanyDetails(company, currentUser);
      onShowToast("Company details updated successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to update company details", "error");
    }
  };

  const handleSaveOffice = () => {
    try {
      ConfigurationRepository.updateOfficeSettings(office, currentUser);
      onShowToast("Office & compliance settings updated successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to update office settings", "error");
    }
  };

  const addHoliday = () => {
    if (!newHolidayName || !newHolidayDate) return;
    const updated = [
      ...office.holidayCalendar,
      { id: `h_${Date.now()}`, date: newHolidayDate, name: newHolidayName }
    ];
    setOffice({ ...office, holidayCalendar: updated });
    setNewHolidayName("");
    setNewHolidayDate("");
  };

  const removeHoliday = (id: string) => {
    const updated = office.holidayCalendar.filter(h => h.id !== id);
    setOffice({ ...office, holidayCalendar: updated });
  };

  const handleDayToggle = (day: string) => {
    const isPresent = office.workingDays.includes(day);
    const updated = isPresent
      ? office.workingDays.filter(d => d !== day)
      : [...office.workingDays, day];
    setOffice({ ...office, workingDays: updated });
  };

  return (
    <div className="space-y-8" id="company-office-studio-panel">
      {/* SECTION 1: Company Studio */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Building className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Company Studio</h3>
              <p className="text-xs text-slate-400">Configure central practice credentials and registration indexes</p>
            </div>
          </div>
          <button
            onClick={handleSaveCompany}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-company-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Company Details
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Brand Name</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.companyName}
              onChange={e => setCompany({ ...company, companyName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Legal Registered Name</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.legalName}
              onChange={e => setCompany({ ...company, legalName: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">GSTIN (GST Number)</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.gstNumber}
              onChange={e => setCompany({ ...company, gstNumber: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Income Tax PAN</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.pan}
              onChange={e => setCompany({ ...company, pan: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Tax Deduction TAN</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.tan}
              onChange={e => setCompany({ ...company, tan: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Import Export Code (IEC)</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.iec}
              onChange={e => setCompany({ ...company, iec: e.target.value })}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">MSME / UDYAM Number</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.msmeUdyam}
              onChange={e => setCompany({ ...company, msmeUdyam: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Primary Contact Email</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.emailIds[0] || ""}
              onChange={e => {
                const arr = [...company.emailIds];
                arr[0] = e.target.value;
                setCompany({ ...company, emailIds: arr });
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-400 font-medium">Primary Office Hotline</label>
            <input
              type="text"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
              value={company.phoneNumbers[0] || ""}
              onChange={e => {
                const arr = [...company.phoneNumbers];
                arr[0] = e.target.value;
                setCompany({ ...company, phoneNumbers: arr });
              }}
            />
          </div>

          <div className="md:col-span-3 space-y-1">
            <label className="text-xs text-slate-400 font-medium">Registered Address</label>
            <textarea
              className="w-full h-16 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none resize-none"
              value={company.address}
              onChange={e => setCompany({ ...company, address: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6 border-t border-slate-800/80 pt-5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Financial & Banking Directives</h4>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Default Currency</label>
              <select
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                value={company.defaultCurrency}
                onChange={e => setCompany({ ...company, defaultCurrency: e.target.value })}
              >
                <option value="INR (₹)">INR - Indian Rupee (₹)</option>
                <option value="USD ($)">USD - US Dollar ($)</option>
                <option value="EUR (€)">EUR - Euro (€)</option>
                <option value="GBP (£)">GBP - British Pound (£)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Active Financial Year</label>
              <input
                type="text"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={company.financialYear}
                onChange={e => setCompany({ ...company, financialYear: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Associated Bank Name</label>
              <input
                type="text"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={company.bankDetails.bankName}
                onChange={e => setCompany({
                  ...company,
                  bankDetails: { ...company.bankDetails, bankName: e.target.value }
                })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Account Number</label>
              <input
                type="text"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={company.bankDetails.accountNo}
                onChange={e => setCompany({
                  ...company,
                  bankDetails: { ...company.bankDetails, accountNo: e.target.value }
                })}
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Office Settings */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Office Settings & Timers</h3>
              <p className="text-xs text-slate-400">Manage operational hours, working days, and compliance durations</p>
            </div>
          </div>
          <button
            onClick={handleSaveOffice}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-office-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Office Settings
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="text-xs text-slate-300 font-medium block mb-2">Standard Operational Working Days</label>
              <div className="flex flex-wrap gap-2">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(day => {
                  const isActive = office.workingDays.includes(day);
                  return (
                    <button
                      key={day}
                      onClick={() => handleDayToggle(day)}
                      className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                        isActive
                          ? "bg-yellow-500/20 border border-yellow-500/40 text-yellow-400"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Office Shift Start</label>
                <input
                  type="time"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={office.officeHours.start}
                  onChange={e => setOffice({
                    ...office,
                    officeHours: { ...office.officeHours, start: e.target.value }
                  })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Office Shift End</label>
                <input
                  type="time"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={office.officeHours.end}
                  onChange={e => setOffice({
                    ...office,
                    officeHours: { ...office.officeHours, end: e.target.value }
                  })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 border-t border-slate-800/60 pt-4">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                  Session Timeout
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" title="Minutes of inactivity before force logout" />
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={office.sessionTimeout}
                  onChange={e => setOffice({ ...office, sessionTimeout: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">File Upload Limit (MB)</label>
                <input
                  type="number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={office.fileSizeLimits}
                  onChange={e => setOffice({ ...office, fileSizeLimits: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Language Locale</label>
                <input
                  type="text"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                  value={office.language}
                  onChange={e => setOffice({ ...office, language: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Holiday Calendar */}
          <div className="bg-slate-950/50 border border-slate-800/80 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/60 pb-2">
              <h4 className="text-xs font-semibold text-slate-300">Holiday Calendar (Compliance Lockouts)</h4>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{office.holidayCalendar.length} Holidays</span>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {office.holidayCalendar.map(holiday => (
                <div key={holiday.id} className="flex items-center justify-between bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg">
                  <div className="text-left">
                    <p className="text-xs text-slate-200 font-medium">{holiday.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">{holiday.date}</p>
                  </div>
                  <button
                    onClick={() => removeHoliday(holiday.id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-800/60">
              <input
                type="text"
                placeholder="Holiday Name"
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-yellow-500"
                value={newHolidayName}
                onChange={e => setNewHolidayName(e.target.value)}
              />
              <input
                type="date"
                className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 outline-none focus:border-yellow-500"
                value={newHolidayDate}
                onChange={e => setNewHolidayDate(e.target.value)}
              />
              <button
                onClick={addHoliday}
                className="px-3 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 text-xs font-medium rounded-lg transition-all border border-yellow-500/25"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
