/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Rule Condition Evaluator & Action Dispatcher Engine
 */

import { BusinessRule, RuleCondition, RuleAction } from "../types/automation";
import { notificationService } from "./notificationService";
import { emailService } from "./emailService";

export class RuleEngine {

  /**
   * Evaluates if event payload matches rule condition logic
   */
  evaluateCondition(condition: RuleCondition, payload: Record<string, any>): boolean {
    const actualVal = String(payload[condition.fieldName] ?? "");
    const targetVal = condition.fieldValue;

    switch (condition.operator) {
      case "EQUALS":
        return actualVal === targetVal;
      case "NOT_EQUALS":
        return actualVal !== targetVal;
      case "GREATER_THAN":
        return Number(actualVal) > Number(targetVal);
      case "LESS_THAN":
        return Number(actualVal) < Number(targetVal);
      case "CONTAINS":
        return actualVal.toLowerCase().includes(targetVal.toLowerCase());
      default:
        return false;
    }
  }

  /**
   * Execute Action payload
   */
  async executeAction(action: RuleAction, payload: Record<string, any>): Promise<void> {
    const config = action.actionConfig;

    if (action.actionType === "SEND_NOTIFICATION" && config.recipientId) {
      await notificationService.sendNotification(
        config.recipientId,
        config.title || "Automation Alert",
        config.message || "Rule triggered successfully"
      );
    } else if (action.actionType === "QUEUE_EMAIL" && config.recipientEmail) {
      await emailService.queueEmail(
        config.recipientEmail,
        config.subject || "Automated System Alert",
        config.body || "<p>System alert triggered</p>"
      );
    }
  }
}

export const ruleEngine = new RuleEngine();
