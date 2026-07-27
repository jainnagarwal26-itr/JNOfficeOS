/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User } from "../../types";
import { BusinessRuleDesignerRepository, VisualRule } from "../../lib/configurationRepositories";
import { Cpu, Save, Plus, Trash2, HelpCircle, AlertCircle, Play } from "lucide-react";

interface Props {
  currentUser: User;
  onShowToast: (message: string, type: "success" | "error") => void;
}

export const BusinessRuleDesigner: React.FC<Props> = ({ currentUser, onShowToast }) => {
  const [rules, setRules] = useState<VisualRule[]>(() => BusinessRuleDesignerRepository.getRules());

  // New Rule/Expression Builders
  const [ruleName, setRuleName] = useState("");
  const [triggerEvent, setTriggerEvent] = useState("INVOICE_GENERATED");
  const [conditionField, setConditionField] = useState("subtotal");
  const [conditionOp, setConditionOp] = useState<"greater_than" | "less_than" | "equal_to" | "contains">("greater_than");
  const [conditionValue, setConditionValue] = useState("");
  const [actionType, setActionType] = useState<"NotifyOwner" | "CreateReminder" | "MarkPriority" | "EscalateSLA">("NotifyOwner");

  const handleSaveRules = () => {
    try {
      rules.forEach(rule => {
        BusinessRuleDesignerRepository.saveRule(rule, currentUser);
      });
      onShowToast("Business Rules & smart expressions saved to memory!", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save rules", "error");
    }
  };

  const handleCreateRule = () => {
    if (!ruleName || !conditionValue) {
      onShowToast("Rule Name and Condition value are required!", "error");
      return;
    }

    const newRule: VisualRule = {
      id: `rule_${Date.now()}`,
      name: ruleName,
      triggerEvent: triggerEvent,
      conditions: [{ field: conditionField, operator: conditionOp, value: conditionValue }],
      actions: [{ type: actionType, params: { alertTemplate: "StandardNotification" } }],
      priority: "High",
      isEnabled: true
    };

    try {
      BusinessRuleDesignerRepository.saveRule(newRule, currentUser);
      const updated = BusinessRuleDesignerRepository.getRules();
      setRules(updated);
      setRuleName("");
      setConditionValue("");
      onShowToast(`Rule '${ruleName}' registered and injected successfully!`, "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to save rule", "error");
    }
  };

  const handleDeleteRule = (id: string) => {
    try {
      BusinessRuleDesignerRepository.deleteRule(id, currentUser);
      const updated = BusinessRuleDesignerRepository.getRules();
      setRules(updated);
      onShowToast("Rule successfully removed.", "success");
    } catch (e: any) {
      onShowToast(e.message || "Failed to delete rule", "error");
    }
  };

  const toggleRuleActive = (id: string) => {
    const updated = rules.map(r => {
      if (r.id === id) {
        const toggled = { ...r, isEnabled: !r.isEnabled };
        BusinessRuleDesignerRepository.saveRule(toggled, currentUser);
        return toggled;
      }
      return r;
    });
    setRules(updated);
    onShowToast("Rule status toggled.", "success");
  };

  return (
    <div className="space-y-6" id="business-rule-designer-panel">
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-slate-100">Business Rule & Smart Expression Studio</h3>
              <p className="text-xs text-slate-400">Configure visual triggers, validation assertions, and automated action rules</p>
            </div>
          </div>
          <button
            onClick={handleSaveRules}
            className="flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-955 font-semibold text-xs rounded-lg transition-all shadow-md"
            id="save-rules-designer-btn"
          >
            <Save className="w-3.5 h-3.5" /> Save Engine Rules
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Creator form (Col A) */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-5 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Configure Automated Rule</h4>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Rule Name</label>
              <input
                type="text"
                placeholder="e.g. Escalate High GST Due"
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-yellow-500 outline-none"
                value={ruleName}
                onChange={e => setRuleName(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 font-medium">Trigger Event</label>
              <select
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 text-xs outline-none"
                value={triggerEvent}
                onChange={e => setTriggerEvent(e.target.value)}
              >
                <option value="INVOICE_GENERATED">When Invoice Created</option>
                <option value="CLIENT_REGISTERED">When Client Registered</option>
                <option value="DOCUMENT_UPLOADED">When Document Uploaded</option>
                <option value="CASE_DELAYED">When Case Delayed (SLA)</option>
              </select>
            </div>

            {/* Smart Statement Builder */}
            <div className="border border-slate-800 p-3.5 rounded-lg bg-slate-950/80 space-y-3">
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Visual Logic Statement</span>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400 font-bold">IF</span>
                  <select
                    className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-0.5 outline-none"
                    value={conditionField}
                    onChange={e => setConditionField(e.target.value)}
                  >
                    <option value="subtotal">invoice subtotal</option>
                    <option value="outstandingAmount">outstanding invoice amount</option>
                    <option value="classification">client classification</option>
                    <option value="documentType">document category</option>
                  </select>

                  <select
                    className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-0.5 outline-none"
                    value={conditionOp}
                    onChange={e => setConditionOp(e.target.value as any)}
                  >
                    <option value="greater_than">&gt;</option>
                    <option value="less_than">&lt;</option>
                    <option value="equal_to">=</option>
                    <option value="contains">contains</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Value"
                    className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-0.5 outline-none w-16 text-center focus:border-yellow-500 font-mono"
                    value={conditionValue}
                    onChange={e => setConditionValue(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="bg-slate-900 px-1.5 py-0.5 rounded text-blue-400 font-bold">THEN</span>
                  <select
                    className="bg-slate-900 border border-slate-800 text-[11px] text-slate-300 rounded px-1.5 py-0.5 outline-none"
                    value={actionType}
                    onChange={e => setActionType(e.target.value as any)}
                  >
                    <option value="NotifyOwner">Alert Company Owner</option>
                    <option value="CreateReminder">Create Reminder Task</option>
                    <option value="MarkPriority">Mark Priority Lead</option>
                    <option value="EscalateSLA">SLA Escalation Alert</option>
                  </select>
                </div>
              </div>
            </div>

            <button
              onClick={handleCreateRule}
              className="w-full py-2 bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold text-xs rounded-lg transition-all shadow-md"
            >
              Compile & Inject Rule
            </button>
          </div>

          {/* Rules List (Col B & C) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Active Rule Engine Assertions</span>
              <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded text-slate-400">{rules.length} Installed</span>
            </h4>

            {rules.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20 text-slate-500 text-xs">
                No active rules installed. Define trigger logic using the builder.
              </div>
            ) : (
              <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                {rules.map(rule => (
                  <div
                    key={rule.id}
                    className={`p-4 rounded-xl border transition-all ${
                      rule.isEnabled
                        ? "bg-slate-950/60 border-slate-800"
                        : "bg-slate-950/20 border-slate-900 opacity-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-slate-200">{rule.name}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleRuleActive(rule.id)}
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold transition-all ${
                            rule.isEnabled
                              ? "bg-green-500/10 text-green-400 border border-green-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          {rule.isEnabled ? "Active" : "Muted"}
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono bg-slate-900/60 p-2.5 rounded border border-slate-800/50 space-y-1">
                      <p>
                        <span className="text-blue-400">Trigger Event:</span> <span className="text-slate-300">{rule.triggerEvent}</span>
                      </p>
                      {rule.conditions.map((cond, idx) => (
                        <p key={idx}>
                          <span className="text-yellow-400">Condition:</span>{" "}
                          <span className="text-slate-400">
                            {cond.field} {cond.operator === "greater_than" ? ">" : cond.operator === "less_than" ? "<" : cond.operator === "equal_to" ? "=" : "contains"} {cond.value}
                          </span>
                        </p>
                      ))}
                      {rule.actions.map((act, idx) => (
                        <p key={idx}>
                          <span className="text-purple-400">Action:</span> <span className="text-slate-400">{act.type}</span>
                        </p>
                      ))}
                    </div>
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
