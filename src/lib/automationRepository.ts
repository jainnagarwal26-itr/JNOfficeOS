/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Automation Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { AutomationRule, RuleExecutionLog } from "../types";
import { BusinessRule } from "../types/automation";

const RULES_STORAGE_KEY = "jn_officeos_automation_rules";
const LOGS_STORAGE_KEY = "jn_officeos_automation_logs";

export class AutomationRepository {
  private static rulesCache: AutomationRule[] = [];
  private static logsCache: RuleExecutionLog[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    
    // Load Rules
    const storedRules = localStorage.getItem(RULES_STORAGE_KEY);
    if (storedRules) {
      try {
        this.rulesCache = JSON.parse(storedRules);
      } catch (e) {
        console.error("Failed to parse stored automation rules", e);
        this.rulesCache = [];
      }
    } else {
      // Default Seed Rules
      const now = new Date().toISOString();
      this.rulesCache = [
        {
          id: "rule_1",
          name: "Automatic Overdue Tax Filing Warning",
          description: "Generates high priority system notification when a compliance filing due date is within 3 calendar days.",
          triggerEvent: "COMPLIANCE_DUE_APPROACHING",
          conditions: [
            { field: "daysToDue", operator: "equals", value: "3" }
          ],
          actions: [
            { type: "GenerateAlert", params: { channel: "Dashboard Alert", priority: "High" } }
          ],
          isEnabled: true,
          priority: "High",
          createdAt: now,
          updatedAt: now
        },
        {
          id: "rule_2",
          name: "Client Payment Receipt Ledger Entry",
          description: "Automatically creates audit timeline entry when payment receipt is confirmed.",
          triggerEvent: "PAYMENT_RECEIPT_GENERATED",
          conditions: [
            { field: "amount", operator: "exists" }
          ],
          actions: [
            { type: "TimelineEntry", params: { logCategory: "FINANCE" } }
          ],
          isEnabled: true,
          priority: "Medium",
          createdAt: now,
          updatedAt: now
        }
      ];
    }

    // Load Logs
    const storedLogs = localStorage.getItem(LOGS_STORAGE_KEY);
    if (storedLogs) {
      try {
        this.logsCache = JSON.parse(storedLogs);
      } catch (e) {
        console.error("Failed to parse stored execution logs", e);
        this.logsCache = [];
      }
    } else {
      const now = new Date().toISOString();
      this.logsCache = [
        {
          id: "log_seed_1",
          ruleId: "rule_1",
          ruleName: "Automatic Overdue Tax Filing Warning",
          timestamp: now,
          status: "SUCCESS",
          details: "Evaluated 3 active compliance records. Flagged 1 client record for upcoming deadline notification.",
          triggerEvent: "COMPLIANCE_DUE_APPROACHING"
        }
      ];
    }

    this.isInitialized = true;
  }

  private static persist() {
    localStorage.setItem(RULES_STORAGE_KEY, JSON.stringify(this.rulesCache));
    localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(this.logsCache));
  }

  // --- STATIC METHODS FOR AUTOMATION HUB ---
  public static getRules(): AutomationRule[] {
    this.init();
    return this.rulesCache;
  }

  public static getLogs(): RuleExecutionLog[] {
    this.init();
    return this.logsCache;
  }

  public static updateRule(id: string, updates: Partial<AutomationRule>): void {
    this.init();
    const index = this.rulesCache.findIndex(r => r.id === id);
    if (index !== -1) {
      this.rulesCache[index] = {
        ...this.rulesCache[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      this.persist();

      if (isSupabaseConfigured()) {
        supabase
          .from("jn_business_rules")
          .update({
            is_active: updates.isEnabled !== undefined ? updates.isEnabled : this.rulesCache[index].isEnabled
          })
          .eq("id", id)
          .then(({ error }) => {
            if (error) console.error("[AutomationRepository] Supabase rule update error:", error);
          });
      }
    }
  }

  public static addLog(logInput: Omit<RuleExecutionLog, "id" | "timestamp"> & Partial<RuleExecutionLog>): void {
    this.init();
    const newLog: RuleExecutionLog = {
      id: logInput.id || `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      ruleId: logInput.ruleId,
      ruleName: logInput.ruleName,
      timestamp: logInput.timestamp || new Date().toISOString(),
      status: logInput.status || "SUCCESS",
      details: logInput.details || "",
      triggerEvent: logInput.triggerEvent || "SYSTEM"
    };

    this.logsCache.unshift(newLog);
    this.persist();
  }

  // --- ASYNC INSTANCE METHODS FOR ENTERPRISE SERVICES ---
  async fetchActiveRules(): Promise<BusinessRule[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_business_rules")
        .select(`
          *,
          conditions:jn_rule_conditions(*),
          actions:jn_rule_actions(*)
        `)
        .eq("is_active", true)
        .is("deleted_at", null);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        ruleCode: row.rule_code,
        ruleName: row.rule_name,
        description: row.description || "",
        eventTrigger: row.event_trigger,
        isActive: row.is_active,
        conditions: (row.conditions || []).map((c: any) => ({
          id: c.id,
          fieldName: c.field_name,
          operator: c.operator,
          fieldValue: c.field_value
        })),
        actions: (row.actions || []).map((a: any) => ({
          id: a.id,
          actionType: a.action_type,
          actionConfig: a.action_config
        }))
      }));
    } catch (err) {
      console.error("[AutomationRepository] fetchActiveRules error:", err);
      return [];
    }
  }
}

export const automationRepository = new AutomationRepository();
