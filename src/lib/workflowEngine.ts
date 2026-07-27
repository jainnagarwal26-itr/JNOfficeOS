/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Configurable Workflow Transition Engine
 */

import { CaseStatus } from "../types/case";

export interface WorkflowTransitionResult {
  allowed: boolean;
  reason?: string;
}

export class WorkflowEngine {
  private allowedTransitions: Record<CaseStatus, CaseStatus[]> = {
    NOT_STARTED: ["IN_PROGRESS", "PENDING_CLIENT_DOCS", "ON_HOLD", "CANCELLED"],
    IN_PROGRESS: ["PENDING_CLIENT_DOCS", "UNDER_REVIEW", "FILED_COMPLETED", "ON_HOLD", "CANCELLED"],
    PENDING_CLIENT_DOCS: ["IN_PROGRESS", "UNDER_REVIEW", "ON_HOLD", "CANCELLED"],
    UNDER_REVIEW: ["IN_PROGRESS", "PENDING_CLIENT_DOCS", "FILED_COMPLETED", "ON_HOLD"],
    FILED_COMPLETED: ["UNDER_REVIEW", "CANCELLED"],
    ON_HOLD: ["IN_PROGRESS", "PENDING_CLIENT_DOCS", "CANCELLED"],
    CANCELLED: ["NOT_STARTED", "IN_PROGRESS"]
  };

  /**
   * Validate if a case status transition is allowed
   */
  canTransition(currentStatus: CaseStatus, targetStatus: CaseStatus): WorkflowTransitionResult {
    if (currentStatus === targetStatus) {
      return { allowed: true };
    }

    const validTargets = this.allowedTransitions[currentStatus] || [];
    if (!validTargets.includes(targetStatus)) {
      return {
        allowed: false,
        reason: `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${validTargets.join(", ")}]`
      };
    }

    return { allowed: true };
  }
}

export const workflowEngine = new WorkflowEngine();
