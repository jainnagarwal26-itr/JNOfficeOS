/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { RolePermissionRepository, RolePermissionsMatrix } from "../../lib/configurationRepositories";
import { Shield, Save, Key, Plus, Trash2 } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const RolePermissionStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [matrices, setMatrices] = useState<RolePermissionsMatrix[]>(() => RolePermissionRepository.getRoles());
  const [selectedRoleIndex, setSelectedRoleIndex] = useState<number>(1); // Default to Manager (1)
  const [newRoleName, setNewRoleName] = useState("");

  const selectedMatrix = matrices[selectedRoleIndex] || matrices[0];

  const handleSaveRole = () => {
    try {
      RolePermissionRepository.saveRoleMatrix(selectedMatrix, currentUser);
      onShowToast(`Role permissions for '${selectedMatrix.role}' saved successfully!`, "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save permissions", "error");
    }
  };

  const handlePageToggle = (pageId: string) => {
    const updatedMatrix = {
      ...selectedMatrix,
      pages: {
        ...selectedMatrix.pages,
        [pageId]: !selectedMatrix.pages[pageId]
      }
    };
    const updatedList = [...matrices];
    updatedList[selectedRoleIndex] = updatedMatrix;
    setMatrices(updatedList);
  };

  const handleActionToggle = (actionId: string) => {
    const updatedMatrix = {
      ...selectedMatrix,
      actions: {
        ...selectedMatrix.actions,
        [actionId]: !selectedMatrix.actions[actionId]
      }
    };
    const updatedList = [...matrices];
    updatedList[selectedRoleIndex] = updatedMatrix;
    setMatrices(updatedList);
  };

  const handleRepoAccessChange = (repoKey: string, level: "None" | "Read" | "ReadWrite") => {
    const updatedMatrix = {
      ...selectedMatrix,
      repositories: {
        ...selectedMatrix.repositories,
        [repoKey]: level
      }
    };
    const updatedList = [...matrices];
    updatedList[selectedRoleIndex] = updatedMatrix;
    setMatrices(updatedList);
  };

  const handleEventAccessChange = (eventKey: string, level: "None" | "SubscribeOnly" | "PublishOnly" | "Full") => {
    const updatedMatrix = {
      ...selectedMatrix,
      events: {
        ...selectedMatrix.events,
        [eventKey]: level
      }
    };
    const updatedList = [...matrices];
    updatedList[selectedRoleIndex] = updatedMatrix;
    setMatrices(updatedList);
  };

  const createRole = () => {
    if (!newRoleName) return;
    const exists = matrices.some(m => m.role.toLowerCase() === newRoleName.toLowerCase());
    if (exists) {
      onShowToast("Role already exists!", "error");
      return;
    }

    const newMatrix: RolePermissionsMatrix = {
      role: newRoleName,
      pages: { crm: true, billing: false, settings: false, audit: false, reports: false, dms: true },
      actions: { deleteClients: false, voidInvoices: false, exportData: false, createUsers: false },
      repositories: { Configuration: "None", Case: "Read", Financial: "None" },
      events: { "*": "SubscribeOnly" }
    };

    const updated = [...matrices, newMatrix];
    setMatrices(updated);
    setSelectedRoleIndex(updated.length - 1);
    setNewRoleName("");
    onShowToast(`Custom Role '${newRoleName}' added! Remember to save.`, "success");
  };

  const deleteRole = (role: string) => {
    if (role === "OWNER" || role === "Manager" || role === "Intern") {
      onShowToast("Cannot delete core system roles!", "error");
      return;
    }
    const updated = matrices.filter(m => m.role !== role);
    setMatrices(updated);
    setSelectedRoleIndex(0);
    onShowToast(`Role '${role}' removed.`, "success");
  };

  return (
    <div className="space-y-6" id="role-permission-studio-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Role & Permission Studio</h3>
              <p className="text-xs text-slate-400">Configure role clearance parameters across pages, transactions, and event streams</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Create Custom Role"
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-slate-200 outline-none w-36 focus:border-yellow-500"
              value={newRoleName}
              onChange={e => setNewRoleName(e.target.value)}
            />
            <button
              onClick={createRole}
              className="px-3 bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 text-xs font-semibold rounded-lg transition-all border border-yellow-500/20"
            >
              <Plus className="w-3.5 h-3.5 inline mr-1" /> Create
            </button>
            <button
              onClick={handleSaveRole}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
              id="save-permissions-btn"
            >
              <Save className="w-3.5 h-3.5" /> Save Selected Matrix
            </button>
          </div>
        </div>

        {/* Roles Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 border-b border-slate-800/40 mb-6 scrollbar-none">
          {matrices.map((matrix, idx) => (
            <div key={matrix.role} className="relative group">
              <button
                onClick={() => setSelectedRoleIndex(idx)}
                className={`px-4 py-2 text-xs font-medium rounded-lg border transition-all ${
                  selectedRoleIndex === idx
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {matrix.role}
              </button>
              {matrix.role !== "OWNER" && matrix.role !== "Manager" && matrix.role !== "Intern" && (
                <button
                  onClick={() => deleteRole(matrix.role)}
                  className="absolute -top-1 -right-1 hidden group-hover:block bg-red-500/80 hover:bg-red-600 text-white p-0.5 rounded-full transition-colors"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Matrix Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Column A: Page Access & Actions */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Key className="w-4 h-4 text-yellow-500" /> Module Access Rights
              </h4>
              <div className="space-y-2.5">
                {Object.entries(selectedMatrix.pages).map(([pageId, isAllowed]) => (
                  <div key={pageId} className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs text-slate-300 font-medium uppercase tracking-wider">{pageId} Dashboard</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-700 rounded"
                      checked={isAllowed}
                      disabled={selectedMatrix.role === "OWNER"}
                      onChange={() => handlePageToggle(pageId)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Shield className="w-4 h-4 text-yellow-500" /> Administrative Capabilities
              </h4>
              <div className="space-y-2.5">
                {Object.entries(selectedMatrix.actions).map(([actionId, isAllowed]) => (
                  <div key={actionId} className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs text-slate-300 font-medium capitalize">{actionId.replace(/([A-Z])/g, " $1")}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-yellow-500 accent-yellow-500 bg-slate-900 border-slate-700 rounded"
                      checked={isAllowed}
                      disabled={selectedMatrix.role === "OWNER"}
                      onChange={() => handleActionToggle(actionId)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Column B: Repositories & Events */}
          <div className="space-y-6">
            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Repository Clearances</h4>
              <div className="space-y-3">
                {Object.entries(selectedMatrix.repositories).map(([repoName, clearance]) => (
                  <div key={repoName} className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs text-slate-300 font-medium">{repoName} Repository</span>
                    <select
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded text-[11px] px-2 py-1 outline-none"
                      value={clearance}
                      disabled={selectedMatrix.role === "OWNER"}
                      onChange={e => handleRepoAccessChange(repoName, e.target.value as any)}
                    >
                      <option value="None">None</option>
                      <option value="Read">Read Only</option>
                      <option value="ReadWrite">Read & Write</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-5">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4">Event Stream Authority</h4>
              <div className="space-y-3">
                {Object.entries(selectedMatrix.events).map(([eventKey, actionType]) => (
                  <div key={eventKey} className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs text-slate-300 font-medium font-mono">{eventKey === "*" ? "Global Stream" : eventKey}</span>
                    <select
                      className="bg-slate-900 border border-slate-800 text-slate-300 rounded text-[11px] px-2 py-1 outline-none"
                      value={actionType}
                      disabled={selectedMatrix.role === "OWNER"}
                      onChange={e => handleEventAccessChange(eventKey, e.target.value as any)}
                    >
                      <option value="None">Locked</option>
                      <option value="SubscribeOnly">Listen Only</option>
                      <option value="PublishOnly">Publish Only</option>
                      <option value="Full">Full Pub-Sub</option>
                    </select>
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
