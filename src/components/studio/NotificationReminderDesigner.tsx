/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import {
  NotificationDesignerRepository,
  ReminderDesignerRepository,
  CustomNotificationConfig,
  ReminderConfigRule
} from "../../lib/configurationRepositories";
import { Bell, Calendar, Save, Plus, Trash2, HelpCircle } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const NotificationReminderDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [notifications, setNotifications] = useState<CustomNotificationConfig[]>(() =>
    NotificationDesignerRepository.getNotifications()
  );
  const [reminders, setReminders] = useState<ReminderConfigRule[]>(() =>
    ReminderDesignerRepository.getReminderRules()
  );

  // New Compliance reminder parameters
  const [remTitle, setRemTitle] = useState("");
  const [remCategory, setRemCategory] = useState("GST");
  const [remCron, setRemCron] = useState("Monthly on 11th");
  const [remLead, setRemLead] = useState(5);

  const handleSaveAll = () => {
    try {
      notifications.forEach(notif => {
        NotificationDesignerRepository.saveNotification(notif, currentUser);
      });
      reminders.forEach(rem => {
        ReminderDesignerRepository.saveReminderRule(rem, currentUser);
      });
      onShowToast("Notification & Compliance Reminder configurations synchronized!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save notification parameters", "error");
    }
  };

  const handleTemplateChange = (id: string, prop: keyof CustomNotificationConfig, value: any) => {
    const updated = notifications.map(t => (t.id === id ? { ...t, [prop]: value } : t));
    setNotifications(updated);
  };

  const handleCreateReminder = () => {
    if (!remTitle || !remCron) {
      onShowToast("Title and Recurrence expression are required!", "error");
      return;
    }

    const newRem: ReminderConfigRule = {
      id: `rem_${Date.now()}`,
      name: remTitle,
      category: remCategory,
      type: remCategory,
      leadDays: remLead,
      isRecurring: true,
      recurringInterval: remCron
    };

    try {
      ReminderDesignerRepository.saveReminderRule(newRem, currentUser);
      const updated = ReminderDesignerRepository.getReminderRules();
      setReminders(updated);
      setRemTitle("");
      setRemCron("Monthly on 11th");
      setRemLead(5);
      onShowToast(`Compliance reminder '${remTitle}' registered!`, "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to add reminder rule", "error");
    }
  };

  const handleDeleteReminder = (id: string) => {
    try {
      ReminderDesignerRepository.deleteReminderRule(id, currentUser);
      const updated = ReminderDesignerRepository.getReminderRules();
      setReminders(updated);
      onShowToast("Compliance reminder removed.", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to remove reminder", "error");
    }
  };

  return (
    <div className="space-y-6" id="notification-reminder-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Bell className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Notification & Compliance Reminder Studio</h3>
              <p className="text-xs text-slate-400">Configure messaging channels, routing templates and tax compliance scheduler crons</p>
            </div>
          </div>
          <button
            onClick={handleSaveAll}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-notifications-designer-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Alerts Configuration
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* SECTION 12: Notification Designer */}
          <div className="space-y-5">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Alert Templates & Channels</h4>

            <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
              {notifications.map(tpl => (
                <div key={tpl.id} className="bg-slate-950/60 border border-slate-800 p-4 rounded-xl space-y-3 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">{tpl.event}</span>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase">
                      Code: {tpl.id}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-medium">Message Body Content (Supports Parameters)</label>
                    <textarea
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-300 outline-none resize-none focus:border-yellow-500 font-sans"
                      value={tpl.template}
                      onChange={e => handleTemplateChange(tpl.id, "template", e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/60 p-1.5 rounded">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-yellow-500 bg-slate-955 rounded"
                        checked={tpl.channels.includes("Email")}
                        onChange={e => {
                          const val = e.target.checked
                            ? [...tpl.channels, "Email"]
                            : tpl.channels.filter(c => c !== "Email");
                          handleTemplateChange(tpl.id, "channels", val);
                        }}
                      />
                      <span className="text-[10px] text-slate-400">Email API</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/60 p-1.5 rounded">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-yellow-500 bg-slate-955 rounded"
                        checked={tpl.channels.includes("SMS")}
                        onChange={e => {
                          const val = e.target.checked
                            ? [...tpl.channels, "SMS"]
                            : tpl.channels.filter(c => c !== "SMS");
                          handleTemplateChange(tpl.id, "channels", val);
                        }}
                      />
                      <span className="text-[10px] text-slate-400">SMS API</span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800/60 p-1.5 rounded">
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 text-yellow-500 bg-slate-955 rounded"
                        checked={tpl.channels.includes("In-App")}
                        onChange={e => {
                          const val = e.target.checked
                            ? [...tpl.channels, "In-App"]
                            : tpl.channels.filter(c => c !== "In-App");
                          handleTemplateChange(tpl.id, "channels", val);
                        }}
                      />
                      <span className="text-[10px] text-slate-400">InApp Pop</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 13: Reminder Designer */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-yellow-500" /> Compliance Scheduler Crons
              </h4>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Compliance Task Title</label>
                <input
                  type="text"
                  placeholder="e.g. Monthly GSTR-1 Verification Alert"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                  value={remTitle}
                  onChange={e => setRemTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Tax Area Category</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                    value={remCategory}
                    onChange={e => setRemCategory(e.target.value)}
                  >
                    <option value="GST">GST Returns</option>
                    <option value="ITR">Income Tax filing</option>
                    <option value="ROC">ROC Compliance</option>
                    <option value="DSC">DSC Key expiry</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-slate-400 font-medium">Trigger Warning Lead Days</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                    value={remLead}
                    onChange={e => setRemLead(Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium flex items-center justify-between">
                  <span>Recurrence Interval Pattern</span>
                  <HelpCircle className="w-3.5 h-3.5 text-slate-500" title="e.g. Monthly on 11th, Yearly on July 31st" />
                </label>
                <input
                  type="text"
                  placeholder="e.g. Monthly on 11th"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none focus:border-yellow-500 font-mono"
                  value={remCron}
                  onChange={e => setRemCron(e.target.value)}
                />
              </div>

              <button
                onClick={handleCreateReminder}
                className="w-full py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-bold text-xs rounded-lg transition-all hover:bg-yellow-500/30"
              >
                Register Recurrent Compliance Cron
              </button>
            </div>

            {/* List panel */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Registered Compliance Crons</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{reminders.length} Active</span>
              </h4>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {reminders.map(rem => (
                  <div key={rem.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-lg text-left">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-200 font-semibold">{rem.name}</span>
                        <span className="text-[9px] bg-slate-800 text-yellow-400 px-1.5 py-0.5 rounded font-mono uppercase">
                          {rem.category}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Interval: <span className="text-slate-400">{rem.recurringInterval}</span> | Warn: <span className="text-slate-400">{rem.leadDays} Days</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDeleteReminder(rem.id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
