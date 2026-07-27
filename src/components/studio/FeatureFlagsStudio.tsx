/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { FeatureFlagRepository, FeatureFlag } from "../../lib/configurationRepositories";
import { Flag, Save, HelpCircle, AlertTriangle } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const FeatureFlagsStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [flags, setFlags] = useState<FeatureFlag[]>(() => FeatureFlagRepository.getFeatureFlags());

  const handleStateChange = (id: string, status: FeatureFlag["status"]) => {
    const isEnabled = status === "Enabled" || status === "Experimental";
    try {
      const updatedFlag = FeatureFlagRepository.updateFeatureFlag(id, { status, isEnabled }, currentUser);
      const updatedList = flags.map(f => (f.id === id ? updatedFlag : f));
      setFlags(updatedList);
      onShowToast(`Module '${updatedFlag.name}' set to ${status}.`, "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to update feature state", "error");
    }
  };

  return (
    <div className="space-y-6" id="feature-flags-studio-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Flag className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Feature Flags Studio</h3>
              <p className="text-xs text-slate-400">Configure accessibility constraints for major and auxiliary practice modules</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {flags.map(flag => (
            <div
              key={flag.id}
              className={`p-4 rounded-xl border transition-all ${
                flag.status === "Enabled"
                  ? "bg-slate-950/60 border-slate-800"
                  : flag.status === "Experimental"
                  ? "bg-slate-950/60 border-yellow-500/20"
                  : "bg-slate-950/20 border-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-200">{flag.name}</span>
                <span
                  className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded ${
                    flag.status === "Enabled"
                      ? "bg-green-500/10 text-green-400 border border-green-500/20"
                      : flag.status === "Experimental"
                      ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                      : flag.status === "Hidden"
                      ? "bg-slate-800 text-slate-400"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  {flag.status}
                </span>
              </div>

              <p className="text-[10px] text-slate-500 mb-4 font-sans leading-relaxed">
                Applet code reference: <span className="font-mono text-slate-400">{flag.id}_module</span>. Controls operational visibility for clients, staff and integrations.
              </p>

              <div className="grid grid-cols-4 gap-1">
                {(["Enabled", "Disabled", "Hidden", "Experimental"] as FeatureFlag["status"][]).map(st => {
                  const isSelected = flag.status === st;
                  return (
                    <button
                      key={st}
                      onClick={() => handleStateChange(flag.id, st)}
                      className={`py-1 text-[9px] rounded font-medium transition-all ${
                        isSelected
                          ? "bg-yellow-500 text-slate-950 font-bold"
                          : "bg-slate-900 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Warning Callout */}
        <div className="mt-8 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4 flex gap-3 max-w-2xl mx-auto">
          <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
          <div className="text-left">
            <h4 className="text-xs font-semibold text-yellow-500 mb-1">Low-Code Flag Control Notice</h4>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Modifying these flags changes general routing filters immediately. Changing a core compliance module flag (such as GST or CRM) to <strong>Disabled</strong> or <strong>Hidden</strong> will lock out staff executives from filing those specific tasks. Experimental features are sandboxed and visible strictly on Owner-class accounts.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
