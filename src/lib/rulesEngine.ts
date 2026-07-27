/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppEvent, AutomationRule } from "../types";
import { AutomationRepository } from "./automationRepository";
import { NotificationRepository } from "./notificationRepository";
import { ReminderRepository } from "./reminderRepository";
import { addAuditLog } from "./db";

export class BusinessRulesEngine {
  /**
   * Evaluates and executes any active automation rules triggered by the given event.
   */
  public static execute(event: AppEvent): void {
    const rules = AutomationRepository.getRules();
    const activeRules = rules.filter(r => r.isEnabled && r.triggerEvent === event.type);

    if (activeRules.length === 0) {
      return;
    }

    console.log(`[RulesEngine] Found ${activeRules.length} enabled rule(s) matching trigger: ${event.type}`);

    for (const rule of activeRules) {
      try {
        // 1. Evaluate conditions
        const conditionsMet = this.evaluateConditions(rule, event);
        if (!conditionsMet) {
          AutomationRepository.addLog({
            ruleId: rule.id,
            ruleName: rule.name,
            eventId: event.id,
            eventType: event.type,
            status: "Skipped",
            actionsTaken: [],
            details: "Conditions not met. Event payload did not match configured filter parameters."
          });
          continue;
        }

        // 2. Execute actions
        const actionsTaken: string[] = [];
        const actionDetails: string[] = [];

        for (const action of rule.actions) {
          const success = this.executeAction(action, event, rule);
          if (success) {
            actionsTaken.push(action.type);
            actionDetails.push(`Successfully completed ${action.type}.`);
          } else {
            actionDetails.push(`Failed to complete ${action.type}.`);
          }
        }

        // 3. Log execution success
        AutomationRepository.addLog({
          ruleId: rule.id,
          ruleName: rule.name,
          eventId: event.id,
          eventType: event.type,
          status: "Success",
          actionsTaken,
          details: `Rule execution completed. Actions: ${actionsTaken.join(", ")}. Notes: ${actionDetails.join(" ")}`
        });

        // 4. Update Audit Log
        addAuditLog(
          "system@officeos.local",
          "Rules Engine Service",
          "SYSTEM" as any,
          "AUTOMATION_RULE_EXECUTED",
          "SYSTEM",
          `Automation rule '${rule.name}' triggered by '${event.type}' executed successfully. Actions completed: [${actionsTaken.join(", ")}].`
        );

      } catch (err: any) {
        console.error(`[RulesEngine] Error executing rule ${rule.id}:`, err);
        AutomationRepository.addLog({
          ruleId: rule.id,
          ruleName: rule.name,
          eventId: event.id,
          eventType: event.type,
          status: "Failed",
          actionsTaken: [],
          details: `Critical crash during rule execution: ${err.message || err}`
        });
      }
    }
  }

  /**
   * Evaluates conditions against the event payload.
   */
  private static evaluateConditions(rule: AutomationRule, event: AppEvent): boolean {
    if (!rule.conditions || rule.conditions.length === 0) {
      return true; // No conditions = always execute
    }

    const payload = event.payload || {};

    for (const cond of rule.conditions) {
      const valueInPayload = payload[cond.field];

      switch (cond.operator) {
        case "equals":
          if (String(valueInPayload) !== String(cond.value)) return false;
          break;
        case "not_equals":
          if (String(valueInPayload) === String(cond.value)) return false;
          break;
        case "exists":
          if (valueInPayload === undefined || valueInPayload === null) return false;
          break;
        case "not_exists":
          if (valueInPayload !== undefined && valueInPayload !== null) return false;
          break;
        case "contains":
          if (!valueInPayload || !String(valueInPayload).toLowerCase().includes(String(cond.value).toLowerCase())) return false;
          break;
        default:
          return false;
      }
    }

    return true;
  }

  /**
   * Helper to replace placeholders in strings (e.g. "${caseId}" -> value)
   */
  private static interpolate(template: string, event: AppEvent): string {
    if (!template) return "";
    let result = template;
    const payload = event.payload || {};
    
    // Build replacement dictionary
    const replacements: Record<string, string> = {
      caseId: payload.id || payload.caseId || "N/A",
      clientName: payload.clientName || "Client",
      fileName: payload.fileName || payload.name || "Document",
      amount: payload.amount ? String(payload.amount) : "0",
      serviceName: payload.serviceName || "Service",
      staffName: payload.staffName || "Staff"
    };

    for (const key of Object.keys(replacements)) {
      result = result.replace(new RegExp(`\\$\\{${key}\\}`, "g"), replacements[key]);
    }

    return result;
  }

  /**
   * Performs an individual rule action.
   */
  private static executeAction(action: any, event: AppEvent, rule: AutomationRule): boolean {
    const payload = event.payload || {};

    try {
      switch (action.type) {
        case "GenerateAlert": {
          const title = this.interpolate(action.params.title, event);
          const message = this.interpolate(action.params.message, event);
          
          NotificationRepository.addNotification({
            type: action.params.type || "Information",
            title,
            message,
            channel: action.params.channel || "In-App Notification",
            priority: rule.priority,
            targetUserId: action.params.channel === "Owner Alert" ? "owner" : (action.params.channel === "Staff Alert" ? "staff" : "all"),
            metadata: {
              eventId: event.id,
              eventType: event.type,
              payloadSummary: {
                caseId: payload.id || payload.caseId,
                clientName: payload.clientName
              }
            }
          });
          return true;
        }

        case "UpdateLedger": {
          const detailMsg = this.interpolate(action.params.message, event);
          addAuditLog(
            "automation@officeos.local",
            "Ledger Automation Engine",
            "SYSTEM" as any,
            "AUTOMATIC_LEDGER_UPDATE",
            "DATABASE",
            `[Auto-Ledger] ${detailMsg}`
          );
          return true;
        }

        case "TimelineEntry": {
          // Add a timeline entry if a case ID is resolved.
          const caseId = payload.id || payload.caseId;
          if (caseId) {
            // To prevent circular dependency compile issues, we resolve the CaseRepository dynamically
            import("./repository").then(({ CaseRepository }) => {
              try {
                const title = this.interpolate(action.params.title || "Automation Event Triggered", event);
                const details = this.interpolate(action.params.details || "Automated state action completed.", event);
                
                const currentCase = CaseRepository.getCaseById(caseId, { id: "system", role: "OWNER" } as any);
                if (currentCase) {
                  currentCase.timeline.unshift({
                    id: `evt_auto_${Date.now()}`,
                    timestamp: new Date().toISOString(),
                    title,
                    details,
                    userEmail: "automation@officeos.local",
                    userName: "OfficeOS Automation Engine"
                  });
                  // Persist the modified case cache
                  localStorage.setItem("jn_officeos_cases", JSON.stringify((CaseRepository as any).casesCache));
                }
              } catch (e) {
                console.error("[RulesEngine] Timeline entry execution deferred/failed:", e);
              }
            });
          }
          return true;
        }

        case "CreateReminder": {
          const title = this.interpolate(action.params.title, event);
          const desc = this.interpolate(action.params.description, event);
          
          // Set standard 3-day buffer from now
          const inThreeDays = new Date(Date.now() + 1000 * 3600 * 24 * 3).toISOString().split("T")[0];

          ReminderRepository.addReminder({
            title,
            description: desc,
            category: action.params.category || "Compliance",
            dueDate: inThreeDays,
            assignedToId: payload.assignedStaffIds?.[0] || "owner",
            clientId: payload.clientId,
            clientName: payload.clientName,
            caseId: payload.id || payload.caseId
          });
          return true;
        }

        default:
          console.warn(`[RulesEngine] Unrecognized action type: ${action.type}`);
          return false;
      }
    } catch (e) {
      console.error(`[RulesEngine] Fail action execution:`, e);
      return false;
    }
  }
}
