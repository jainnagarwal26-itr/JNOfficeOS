/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: High-Level Automation Service Engine
 */

import { eventBus } from "./eventBus";
import { ruleEngine } from "./ruleEngine";
import { automationRepository } from "./automationRepository";

export class AutomationService {
  private initialized = false;

  /**
   * Initialize Event Bus listeners to trigger business rule execution automatically
   */
  initialize(): void {
    if (this.initialized) return;

    const events = ["CLIENT_CREATED", "CASE_STATUS_CHANGED", "INVOICE_OVERDUE", "DOCUMENT_EXPIRING", "PAYMENT_RECEIVED"];

    events.forEach(eventName => {
      eventBus.subscribe(eventName, async (evt, payload) => {
        await this.handleEventTrigger(evt, payload);
      });
    });

    this.initialized = true;
  }

  private async handleEventTrigger(eventName: string, payload: Record<string, any>): Promise<void> {
    try {
      const activeRules = await automationRepository.fetchActiveRules();
      const matchingRules = activeRules.filter(r => r.eventTrigger === eventName);

      for (const rule of matchingRules) {
        let allConditionsPassed = true;

        if (rule.conditions && rule.conditions.length > 0) {
          allConditionsPassed = rule.conditions.every(cond => ruleEngine.evaluateCondition(cond, payload));
        }

        if (allConditionsPassed && rule.actions) {
          for (const action of rule.actions) {
            await ruleEngine.executeAction(action, payload);
          }
        }
      }
    } catch (err) {
      console.error(`[AutomationService] handleEventTrigger error for '${eventName}':`, err);
    }
  }
}

export const automationService = new AutomationService();
automationService.initialize();
