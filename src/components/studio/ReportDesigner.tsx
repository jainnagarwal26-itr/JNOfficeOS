/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { ReportDesignerRepository, ReportTemplate, CalculatedColumn } from "../../lib/configurationRepositories";
import { FileSpreadsheet, Save, Plus, Trash2, HelpCircle, Star } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const ReportDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [templates, setTemplates] = useState<ReportTemplate[]>(() => ReportDesignerRepository.getReports());
  const [selectedTemplateIndex, setSelectedTemplateIndex] = useState(0);

  // Custom calculation parameters
  const [newCalcName, setNewCalcName] = useState("");
  const [newFormula, setNewFormula] = useState("");

  const currentTemplate = templates[selectedTemplateIndex] || templates[0];

  const handleSaveTemplates = () => {
    try {
      templates.forEach(tpl => {
        ReportDesignerRepository.saveReport(tpl, currentUser);
      });
      onShowToast("Report templates written to repository!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to write templates", "error");
    }
  };

  const handleToggleColumn = (colKey: string) => {
    const updatedCols = currentTemplate.columns.includes(colKey)
      ? currentTemplate.columns.filter(c => c !== colKey)
      : [...currentTemplate.columns, colKey];

    const updatedTemplate = { ...currentTemplate, columns: updatedCols };
    const updatedList = [...templates];
    updatedList[selectedTemplateIndex] = updatedTemplate;
    setTemplates(updatedList);
  };

  const handleCreateCalculation = () => {
    if (!newCalcName || !newFormula) {
      onShowToast("Calculation Name and Formula are required!", "error");
      return;
    }

    const newCalc: CalculatedColumn = {
      name: newCalcName.trim().replace(/\s+/g, ""),
      formula: newFormula
    };

    const updatedTemplate = {
      ...currentTemplate,
      calculatedColumns: [...currentTemplate.calculatedColumns, newCalc]
    };

    const updatedList = [...templates];
    updatedList[selectedTemplateIndex] = updatedTemplate;
    setTemplates(updatedList);

    setNewCalcName("");
    setNewFormula("");
    onShowToast(`Calculated column '${newCalc.name}' created!`, "success");
  };

  const handleDeleteCalculation = (name: string) => {
    const updatedTemplate = {
      ...currentTemplate,
      calculatedColumns: currentTemplate.calculatedColumns.filter(c => c.name !== name)
    };
    const updatedList = [...templates];
    updatedList[selectedTemplateIndex] = updatedTemplate;
    setTemplates(updatedList);
    onShowToast("Calculated column removed.", "success");
  };

  const handleToggleFavorite = () => {
    const updatedTemplate = { ...currentTemplate, isFavorite: !currentTemplate.isFavorite };
    const updatedList = [...templates];
    updatedList[selectedTemplateIndex] = updatedTemplate;
    setTemplates(updatedList);
    onShowToast(currentTemplate.isFavorite ? "Removed from Favorites" : "Marked as Favorite", "success");
  };

  return (
    <div className="space-y-6" id="report-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Practice Report Template Designer</h3>
              <p className="text-xs text-slate-400">Configure visual data reporting structures, custom GST ratios and automated calculation columns</p>
            </div>
          </div>
          <button
            onClick={handleSaveTemplates}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-reports-designer-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Report Blueprints
          </button>
        </div>

        {/* Template Selectors */}
        <div className="flex flex-wrap items-center gap-3 mb-6 bg-slate-950/40 p-3 rounded-lg border border-slate-800/60 justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Reports:</span>
            {templates.map((tpl, idx) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplateIndex(idx)}
                className={`px-3 py-1 text-[10px] font-medium border rounded transition-all ${
                  selectedTemplateIndex === idx
                    ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {tpl.name}
              </button>
            ))}
          </div>

          <button
            onClick={handleToggleFavorite}
            className={`flex items-center gap-1.5 px-3 py-1 border text-[10px] rounded transition-all ${
              currentTemplate.isFavorite
                ? "bg-yellow-500/25 text-yellow-400 border-yellow-500/30"
                : "bg-slate-900 border-slate-800 text-slate-400"
            }`}
          >
            <Star className={`w-3.5 h-3.5 ${currentTemplate.isFavorite ? "fill-yellow-500 text-yellow-500" : ""}`} />
            {currentTemplate.isFavorite ? "Favorite Template" : "Mark Favorite"}
          </button>
        </div>

        {/* Form elements split */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Columns (Col A) */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Toggle Printable Columns</h4>
            <div className="space-y-2 text-left">
              {["clientId", "clientName", "invoiceNo", "amount", "balanceAmount", "status", "dueDate", "createdDate"].map(col => {
                const isActive = currentTemplate.columns.includes(col);
                return (
                  <button
                    key={col}
                    onClick={() => handleToggleColumn(col)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-lg border transition-all text-left ${
                      isActive
                        ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-400"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-300"
                    }`}
                  >
                    <span className="text-xs font-mono">{col}</span>
                    <span className="text-[10px] uppercase font-bold">{isActive ? "ON" : "OFF"}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* New Calculated Column (Col B) */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Add Calculated Expression Column</h4>

            <div className="space-y-3 text-left">
              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Column Key Name</label>
                <input
                  type="text"
                  placeholder="e.g. igstAmount"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none font-mono"
                  value={newCalcName}
                  onChange={e => setNewCalcName(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400 font-medium">Mathematical Formula</label>
                <input
                  type="text"
                  placeholder="e.g. subtotal * 0.18"
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:border-yellow-500 outline-none font-mono"
                  value={newFormula}
                  onChange={e => setNewFormula(e.target.value)}
                />
              </div>

              <button
                onClick={handleCreateCalculation}
                className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-bold text-xs rounded-lg transition-all"
              >
                Inject Calculated Column
              </button>
            </div>
          </div>

          {/* Active Calculations Preview (Col C) */}
          <div className="space-y-4 text-left">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Active Calculated Columns</h4>

            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {currentTemplate.calculatedColumns.map(calc => (
                <div key={calc.name} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                  <div className="text-left">
                    <span className="text-xs text-slate-200 font-semibold font-mono">{calc.name}</span>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      Formula: <span className="text-yellow-500">{calc.formula}</span>
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteCalculation(calc.name)}
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Simulated Live Table Output Preview */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-4">
              <h5 className="text-[10px] text-slate-500 uppercase tracking-wider mb-2 font-mono">Simulated Report Header Preview</h5>
              <div className="flex flex-wrap gap-2">
                {currentTemplate.columns.map(col => (
                  <span key={col} className="bg-slate-900 border border-slate-800 text-slate-300 text-[9px] px-2 py-1 rounded font-mono">
                    {col}
                  </span>
                ))}
                {currentTemplate.calculatedColumns.map(calc => (
                  <span key={calc.name} className="bg-yellow-500/10 border border-yellow-500/25 text-yellow-400 text-[9px] px-2 py-1 rounded font-mono">
                    {calc.name} (Calculated)
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
