/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { SnapshotRepository, ConfigSnapshot } from "../../lib/configurationRepositories";
import { History, Save, Plus, RotateCcw, AlertTriangle, Download, Upload, Cpu, Play, Sparkles } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const SnapshotMarketplaceStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [snapshots, setSnapshots] = useState<ConfigSnapshot[]>(() => SnapshotRepository.getSnapshots());
  const [snapshotComment, setSnapshotComment] = useState("");
  const [importedJson, setImportedJson] = useState("");

  const handleCreateSnapshot = () => {
    if (!snapshotComment) {
      onShowToast("Snapshot description / audit log comment is required!", "error");
      return;
    }

    try {
      SnapshotRepository.createSnapshot(snapshotComment, currentUser);
      const updated = SnapshotRepository.getSnapshots();
      setSnapshots(updated);
      setSnapshotComment("");
      onShowToast("Configuration Snapshot captured, archived and signed!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to create snapshot", "error");
    }
  };

  const handleRestoreSnapshot = (id: string) => {
    if (!window.confirm("Are you absolutely sure you want to rollback all company branding, security rules, and numbering schemes to this configuration?")) {
      return;
    }

    try {
      SnapshotRepository.restoreSnapshot(id, currentUser);
      onShowToast("All configurations restored to historic baseline successfully!", "success");
      // Reload page to re-render brand parameters
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      onShowToast(e.message || "Failed to restore snapshot", "error");
    }
  };

  const handleExportConfig = () => {
    try {
      const keysToExport = [
        "jn_officeos_company",
        "jn_officeos_branding",
        "jn_officeos_office",
        "jn_officeos_numbering",
        "jn_officeos_flags",
        "jn_officeos_dashboards",
        "jn_officeos_reports",
        "jn_officeos_workflows",
        "jn_officeos_rules",
        "jn_officeos_notifications",
        "jn_officeos_reminders",
        "jn_officeos_custom_fields",
        "jn_officeos_expressions"
      ];
      const data: Record<string, string | null> = {};
      keysToExport.forEach(k => {
        data[k] = localStorage.getItem(k);
      });
      const dataStr = JSON.stringify(data, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `jn_officeos_config_backup_${Date.now()}.json`;
      a.click();
      onShowToast("Configuration JSON file exported successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to export config", "error");
    }
  };

  const handleImportConfig = () => {
    if (!importedJson) {
      onShowToast("Please paste configuration JSON to import!", "error");
      return;
    }

    try {
      const parsed = JSON.parse(importedJson);
      Object.entries(parsed).forEach(([k, val]) => {
        if (typeof val === "string") {
          localStorage.setItem(k, val);
        }
      });
      onShowToast("Configuration JSON imported, verified and hot-reloaded!", "success");
      setImportedJson("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (e: any) {
      onShowToast(e.message || "Verification Failed! Ensure valid metadata structure", "error");
    }
  };

  // Mock Marketplace Catalog data for Section 17
  const marketplaceModules = [
    {
      id: "ai_advise",
      name: "AI Report Advisor Extension",
      description: "Appends generative advisory and natural language summary features directly on client report interfaces.",
      status: "Ready to Install",
      requirements: "Gemini API Secret Key"
    },
    {
      id: "whatsapp_gateway",
      name: "Automated WhatsApp API Gate",
      description: "Routes tax compliance deadlines and pending invoices straight to client mobile numbers.",
      status: "Config Required",
      requirements: "WhatsApp Business Token"
    },
    {
      id: "spanner_db_link",
      name: "Relational Spanner Cloud Sync",
      description: "Synchronizes invoice lists, case documents, and client master files with low-latency relational stores.",
      status: "Ready to Provision",
      requirements: "Google Cloud Project Linkage"
    }
  ];

  return (
    <div className="space-y-8" id="snapshot-marketplace-studio-panel">
      {/* SECTION 16: Snapshot Manager */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <History className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Snapshot & Backup Manager</h3>
              <p className="text-xs text-slate-400">Capture atomic configuration snapshots, rollback changes or export physical files</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form (Col A) */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4 text-left">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Capture Config Snapshot</h4>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Snapshot Description</label>
              <textarea
                rows={3}
                placeholder="e.g. Pre-audit checkpoint for GST Q1"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none resize-none"
                value={snapshotComment}
                onChange={e => setSnapshotComment(e.target.value)}
              />
            </div>

            <button
              onClick={handleCreateSnapshot}
              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-955 font-semibold text-xs rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Commit Snapshot
            </button>

            <div className="border-t border-slate-800 pt-4 space-y-3">
              <h5 className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">Physical Configuration Transport</h5>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleExportConfig}
                  className="py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-medium text-[10px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3 h-3 text-yellow-500" /> Export Backup
                </button>
                <button
                  onClick={handleImportConfig}
                  className="py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-medium text-[10px] transition-all flex items-center justify-center gap-1.5"
                >
                  <Upload className="w-3 h-3 text-yellow-500" /> Trigger Import
                </button>
              </div>

              <textarea
                rows={3}
                placeholder="Paste backup JSON string here for physical Import..."
                className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-[10px] text-slate-300 outline-none font-mono resize-none"
                value={importedJson}
                onChange={e => setImportedJson(e.target.value)}
              />
            </div>
          </div>

          {/* Snapshot list (Col B & C) */}
          <div className="lg:col-span-2 space-y-4 text-left">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Historic Backup Registry</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{snapshots.length} Stored</span>
            </h4>

            {snapshots.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs">
                No configurations archived yet. Press Commit to capture current system state.
              </div>
            ) : (
              <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
                {snapshots.map(snap => (
                  <div key={snap.id} className="p-4 rounded-xl border border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-xs font-bold text-slate-200 block">{snap.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 block">
                        Archived: {new Date(snap.timestamp).toLocaleString()} | ID: {snap.id}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRestoreSnapshot(snap.id)}
                      className="px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 hover:text-yellow-300 border border-yellow-500/20 rounded font-medium text-[10px] transition-all flex items-center gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Rollback
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 17: Low-Code Marketplace */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Low-Code & Integration Marketplace</h3>
              <p className="text-xs text-slate-400">Discover and hot-load third-party platform API connectors and dashboard modules</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          {marketplaceModules.map(module => (
            <div key={module.id} className="bg-slate-950/50 border border-slate-800 rounded-xl p-5 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">{module.name}</span>
                  <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{module.description}</p>
                <div className="pt-2">
                  <span className="text-[9px] text-slate-500 font-semibold block uppercase">Requirements</span>
                  <span className="text-[10px] text-yellow-500/80 font-mono">{module.requirements}</span>
                </div>
              </div>

              <button className="w-full py-1.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 rounded font-semibold text-[10px] transition-all flex items-center justify-center gap-1.5">
                <Play className="w-3 h-3 text-yellow-500" /> {module.status}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
