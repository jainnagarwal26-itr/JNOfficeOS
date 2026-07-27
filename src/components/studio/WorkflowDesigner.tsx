/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { WorkflowDesignerRepository, WorkflowConfig, WorkflowStage } from "../../lib/configurationRepositories";
import { Workflow, Save, Plus, Trash2, HelpCircle, ArrowRight } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const WorkflowDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [configs, setConfigs] = useState<WorkflowConfig[]>(() => WorkflowDesignerRepository.getWorkflows());
  const [selectedWorkflowIndex, setSelectedWorkflowIndex] = useState(0);

  // New stage builder parameters
  const [newStageName, setNewStageName] = useState("");
  const [newStageColor, setNewStageColor] = useState("#eab308");
  const [newRequiredDoc, setNewRequiredDoc] = useState("");

  const currentWorkflow = configs[selectedWorkflowIndex] || configs[0];

  const handleSaveWorkflows = () => {
    try {
      configs.forEach(flow => {
        WorkflowDesignerRepository.saveWorkflow(flow, currentUser);
      });
      onShowToast("Workflow pipeline topologies saved successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save workflow rules", "error");
    }
  };

  const handleCreateStage = () => {
    if (!newStageName) {
      onShowToast("Stage Name is required!", "error");
      return;
    }

    const newStage: WorkflowStage = {
      id: `stg_${Date.now()}`,
      name: newStageName,
      statusColor: newStageColor,
      approvalRequired: false,
      requiredDocuments: newRequiredDoc ? [newRequiredDoc] : [],
      completionRule: "",
      escalationRules: []
    };

    const updatedWorkflow = {
      ...currentWorkflow,
      stages: [...currentWorkflow.stages, newStage]
    };

    const updatedList = [...configs];
    updatedList[selectedWorkflowIndex] = updatedWorkflow;
    setConfigs(updatedList);

    setNewStageName("");
    setNewRequiredDoc("");
    onShowToast(`Workflow stage '${newStageName}' registered!`, "success");
  };

  const handleDeleteStage = (id: string) => {
    const updatedWorkflow = {
      ...currentWorkflow,
      stages: currentWorkflow.stages.filter(s => s.id !== id)
    };
    const updatedList = [...configs];
    updatedList[selectedWorkflowIndex] = updatedWorkflow;
    setConfigs(updatedList);
    onShowToast("Stage removed.", "success");
  };

  const handleStagePropChange = (id: string, prop: keyof WorkflowStage, value: any) => {
    const updatedStages = currentWorkflow.stages.map(s => (s.id === id ? { ...s, [prop]: value } : s));
    const updatedWorkflow = { ...currentWorkflow, stages: updatedStages };
    const updatedList = [...configs];
    updatedList[selectedWorkflowIndex] = updatedWorkflow;
    setConfigs(updatedList);
  };

  return (
    <div className="space-y-6" id="workflow-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Workflow className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Low-Code Workflow Designer</h3>
              <p className="text-xs text-slate-400">Configure compliance stage transitions, checklist gateways, and SLA parameters</p>
            </div>
          </div>
          <button
            onClick={handleSaveWorkflows}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-workflow-designer-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Workflow Blueprint
          </button>
        </div>

        {/* Category Selectors */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60">
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Compliance Pipelines:</span>
          {configs.map((flow, idx) => (
            <button
              key={flow.id}
              onClick={() => setSelectedWorkflowIndex(idx)}
              className={`px-3 py-1 text-[10px] font-medium border rounded transition-all ${
                selectedWorkflowIndex === idx
                  ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {flow.name}
            </button>
          ))}
        </div>

        {/* Designer Board Split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator & Stages detail (Col A) */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Append Pipeline Stage</h4>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Stage Name</label>
              <input
                type="text"
                placeholder="e.g. Quality Audit"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={newStageName}
                onChange={e => setNewStageName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Badge Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                    value={newStageColor}
                    onChange={e => setNewStageColor(e.target.value)}
                  />
                  <input
                    type="text"
                    className="w-20 bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[10px]"
                    value={newStageColor}
                    onChange={e => setNewStageColor(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Mandatory Document Gate</label>
                <input
                  type="text"
                  placeholder="e.g. SignedForm16"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1.5 text-slate-300 text-[10px] outline-none"
                  value={newRequiredDoc}
                  onChange={e => setNewRequiredDoc(e.target.value)}
                />
              </div>
            </div>

            <button
              onClick={handleCreateStage}
              className="w-full py-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/20 font-bold text-xs rounded-lg transition-all hover:bg-yellow-500/30"
            >
              Append Stage Node
            </button>
          </div>

          {/* Interactive Topology Visual Nodes (Col B & C) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Visual pipeline topology</h4>
            <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-5 min-h-[300px] flex flex-col justify-between">
              {/* Nodes Sequence representation */}
              <div className="flex flex-wrap items-center gap-3 py-6 justify-center">
                {currentWorkflow.stages.map((stage, idx) => (
                  <React.Fragment key={stage.id}>
                    <div className="relative group bg-slate-900 border border-slate-800/80 p-3 rounded-lg text-center min-w-[120px] shadow-lg hover:border-yellow-500/30 transition-all">
                      <div className="w-2 h-2 rounded-full absolute top-2 left-2" style={{ backgroundColor: stage.statusColor }} />
                      <span className="text-xs font-semibold text-slate-200 block mb-1">{stage.name}</span>
                      <span className="text-[9px] text-slate-500 font-mono">Limit: 3 SLA Days</span>

                      {/* Floating details config inside node */}
                      <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="checkbox"
                            checked={stage.approvalRequired}
                            onChange={e => handleStagePropChange(stage.id, "approvalRequired", e.target.checked)}
                            className="w-3 h-3 text-yellow-500 bg-slate-950 rounded"
                            title="Require Owner Approval"
                          />
                          <span className="text-slate-400 text-[9px]">Approval</span>
                        </div>
                        <button
                          onClick={() => handleDeleteStage(stage.id)}
                          className="text-red-400 hover:text-red-300 opacity-60 group-hover:opacity-100 transition-opacity"
                        >
                          ✕
                        </button>
                      </div>
                    </div>

                    {idx < currentWorkflow.stages.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    )}
                  </React.Fragment>
                ))}
              </div>

              {/* Advanced Rule Details */}
              <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-lg space-y-2 text-left">
                <h5 className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Checklist Validation Gates</h5>
                <div className="grid grid-cols-2 gap-4">
                  {currentWorkflow.stages.map(stage => (
                    <div key={stage.id} className="text-[11px] text-slate-500 flex justify-between items-center border-b border-slate-950 pb-1.5">
                      <span className="font-medium text-slate-300">{stage.name}:</span>
                      <span className="font-mono text-yellow-500/80">
                        {stage.requiredDocuments.length > 0 ? stage.requiredDocuments.join(", ") : "No Gate"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
