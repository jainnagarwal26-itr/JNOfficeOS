/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { ConfigurationRepository, NumberingConfigs, CustomField, NumberFormatConfig } from "../../lib/configurationRepositories";
import { Hash, Save, Sliders, Plus, Trash2, HelpCircle } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const NumberingFieldsStudio: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [numbering, setNumbering] = useState<NumberingConfigs>(() => ConfigurationRepository.getNumberingFormats());
  const [customFields, setCustomFields] = useState<CustomField[]>(() => ConfigurationRepository.getCustomFields());

  // New Custom Field State
  const [targetEntity, setTargetEntity] = useState<CustomField["entity"]>("Client");
  const [fieldName, setFieldName] = useState("");
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<CustomField["type"]>("Text");
  const [fieldOptions, setFieldOptions] = useState("");
  const [fieldRequired, setFieldRequired] = useState(false);

  const handleSaveNumbering = () => {
    try {
      ConfigurationRepository.updateNumberingFormats(numbering, currentUser);
      onShowToast("Entity numbering configurations saved successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save numbering", "error");
    }
  };

  const handleCreateCustomField = () => {
    if (!fieldName || !fieldLabel) {
      onShowToast("Name and Label are required!", "error");
      return;
    }

    const cleanedName = fieldName.trim().replace(/\s+/g, "");

    const newField: CustomField = {
      id: `cf_${Date.now()}`,
      entity: targetEntity,
      name: cleanedName,
      label: fieldLabel,
      type: fieldType,
      options: fieldOptions ? fieldOptions.split(",").map(o => o.trim()) : [],
      required: fieldRequired
    };

    try {
      const updated = ConfigurationRepository.saveCustomField(newField, currentUser);
      setCustomFields(updated);
      setFieldName("");
      setFieldLabel("");
      setFieldOptions("");
      setFieldRequired(false);
      onShowToast("Custom Field registered and compiled successfully!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to register custom field", "error");
    }
  };

  const handleDeleteCustomField = (id: string) => {
    try {
      const updated = ConfigurationRepository.deleteCustomField(id, currentUser);
      setCustomFields(updated);
      onShowToast("Custom field removed.", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to remove custom field", "error");
    }
  };

  return (
    <div className="space-y-8" id="numbering-fields-studio-panel">
      {/* SECTION 5: Numbering Studio */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Hash className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Numbering Studio</h3>
              <p className="text-xs text-slate-400">Configure visual auto-increment prefixes and format reset intervals</p>
            </div>
          </div>
          <button
            onClick={handleSaveNumbering}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-medium text-xs rounded-lg transition-all shadow-md"
            id="save-numbering-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Auto-Numbering formats
          </button>
        </div>

        <div className="space-y-4">
          {Object.entries(numbering).map(([key, unknownConfig]) => {
            const config = unknownConfig as NumberFormatConfig;
            const previewText = `${config.prefix}${config.financialYearEnabled ? "2026-27/" : ""}${String(config.currentValue).padStart(config.runningNumberPadding, "0")}${config.suffix}`;
            return (
              <div key={key} className="bg-slate-950/40 border border-slate-800 p-4 rounded-xl grid grid-cols-1 md:grid-cols-7 gap-4 items-center">
                <div className="text-left md:col-span-1">
                  <h4 className="text-xs font-semibold text-slate-200 capitalize">{key} Series</h4>
                  <p className="text-[10px] text-slate-500 font-mono mt-0.5">Auto Sequence</p>
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] text-slate-500 font-medium">Prefix</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]"
                    value={config.prefix}
                    onChange={e => {
                      const updated = { ...numbering };
                      updated[key as keyof NumberingConfigs].prefix = e.target.value;
                      setNumbering(updated);
                    }}
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] text-slate-500 font-medium">Suffix</label>
                  <input
                    type="text"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]"
                    value={config.suffix}
                    onChange={e => {
                      const updated = { ...numbering };
                      updated[key as keyof NumberingConfigs].suffix = e.target.value;
                      setNumbering(updated);
                    }}
                  />
                </div>

                <div className="flex items-center gap-2 md:col-span-1 pt-4">
                  <input
                    type="checkbox"
                    id={`fy-toggle-${key}`}
                    className="w-3.5 h-3.5 text-yellow-500 accent-yellow-500 rounded bg-slate-900"
                    checked={config.financialYearEnabled}
                    onChange={e => {
                      const updated = { ...numbering };
                      updated[key as keyof NumberingConfigs].financialYearEnabled = e.target.checked;
                      setNumbering(updated);
                    }}
                  />
                  <label htmlFor={`fy-toggle-${key}`} className="text-[10px] text-slate-400 cursor-pointer">Append FY</label>
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] text-slate-500 font-medium">Padding Width</label>
                  <input
                    type="number"
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 font-mono text-[11px]"
                    value={config.runningNumberPadding}
                    onChange={e => {
                      const updated = { ...numbering };
                      updated[key as keyof NumberingConfigs].runningNumberPadding = Number(e.target.value);
                      setNumbering(updated);
                    }}
                  />
                </div>

                <div className="space-y-1 md:col-span-1">
                  <label className="text-[10px] text-slate-500 font-medium">Reset Rule</label>
                  <select
                    className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-slate-300 text-[10px]"
                    value={config.resetRule}
                    onChange={e => {
                      const updated = { ...numbering };
                      updated[key as keyof NumberingConfigs].resetRule = e.target.value as any;
                      setNumbering(updated);
                    }}
                  >
                    <option value="Never">Never Reset</option>
                    <option value="Yearly">Reset Yearly</option>
                    <option value="Monthly">Reset Monthly</option>
                  </select>
                </div>

                {/* Live Output */}
                <div className="space-y-1 md:col-span-1 text-right">
                  <label className="text-[10px] text-slate-500 font-medium block">Sequence Sample</label>
                  <span className="inline-block bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-[10px] font-mono px-2.5 py-1 rounded">
                    {previewText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 14: Custom Fields Designer */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Sliders className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Custom Fields Designer</h3>
              <p className="text-xs text-slate-400">Append custom relational variables into Client CRM profile, cases or invoice registers</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Register Additional Field</h4>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Target Entity Category</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                value={targetEntity}
                onChange={e => setTargetEntity(e.target.value as any)}
              >
                <option value="Client">Client CRM Profile</option>
                <option value="Case">Compliance Case folder</option>
                <option value="Invoice">Tax Invoice ledger</option>
                <option value="Payment">Receipt registers</option>
                <option value="Document">Smart DMS Document</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Technical Field Key (PascalCase / CamelCase)</label>
              <input
                type="text"
                placeholder="e.g. auditSpecialNote"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={fieldName}
                onChange={e => setFieldName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Visual Human Label</label>
              <input
                type="text"
                placeholder="e.g. Special Auditor Note"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={fieldLabel}
                onChange={e => setFieldLabel(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Field Entry Mode</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                value={fieldType}
                onChange={e => setFieldType(e.target.value as any)}
              >
                <option value="Text">Standard Character String</option>
                <option value="Number">Numeric Value Range</option>
                <option value="Date">Date Calendar Selector</option>
                <option value="Dropdown">Single Option Dropdown</option>
                <option value="Checkbox">Toggle Checkbox</option>
              </select>
            </div>

            {fieldType === "Dropdown" && (
              <div className="space-y-1">
                <label className="text-[11px] text-slate-400 font-medium">Comma Separated Options</label>
                <input
                  type="text"
                  placeholder="Retail, Tech, Wholesale"
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                  value={fieldOptions}
                  onChange={e => setFieldOptions(e.target.value)}
                />
              </div>
            )}

            <div className="flex items-center gap-2 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
              <input
                type="checkbox"
                id="required-cf-cb"
                className="w-3.5 h-3.5 text-yellow-500 accent-yellow-500 rounded bg-slate-900"
                checked={fieldRequired}
                onChange={e => setFieldRequired(e.target.checked)}
              />
              <label htmlFor="required-cf-cb" className="text-xs text-slate-300 font-medium cursor-pointer">
                Required Field (Enforces Validation)
              </label>
            </div>

            <button
              onClick={handleCreateCustomField}
              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md"
            >
              Compile & Inject Custom Field
            </button>
          </div>

          {/* List panel */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Currently Injected Custom Fields</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{customFields.length} Registered</span>
            </h4>

            {customFields.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs">
                No custom fields injected. Use the creator module to attach metadata.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {customFields.map(field => (
                  <div key={field.id} className="flex items-center justify-between bg-slate-950/60 border border-slate-800 p-3 rounded-lg">
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-200 font-semibold">{field.label}</span>
                        <span className="text-[10px] bg-slate-800/80 text-yellow-400 px-2 py-0.5 rounded font-mono uppercase">
                          {field.entity}
                        </span>
                        {field.required && (
                          <span className="text-[9px] text-red-400 font-semibold uppercase tracking-wider">Required</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 font-mono mt-1">
                        Key: <span className="text-slate-400">{field.name}</span> | Type: <span className="text-slate-400">{field.type}</span>
                        {field.options.length > 0 && ` | Values: (${field.options.join(", ")})`}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCustomField(field.id)}
                      className="text-red-400 hover:text-red-300 p-1.5 rounded hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
