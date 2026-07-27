/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Automation Engine & Business Rules Types
 */

export interface RuleCondition {
  id?: string;
  ruleId?: string;
  fieldName: string;
  operator: "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS";
  fieldValue: string;
}

export interface RuleAction {
  id?: string;
  ruleId?: string;
  actionType: "SEND_NOTIFICATION" | "QUEUE_EMAIL" | "QUEUE_WHATSAPP" | "CREATE_TASK" | "UPDATE_STATUS";
  actionConfig: Record<string, any>;
}

export interface BusinessRule {
  id?: string;
  ruleCode: string; // e.g. 'RULE_OVERDUE_INVOICE_REMINDER'
  ruleName: string;
  description?: string;
  eventTrigger: string; // 'CLIENT_CREATED', 'CASE_STATUS_CHANGED', 'INVOICE_OVERDUE', 'DOCUMENT_EXPIRING'
  isActive: boolean;
  conditions?: RuleCondition[];
  actions?: RuleAction[];
  createdAt?: string;
}

export interface SchedulerJob {
  id?: string;
  jobCode: string; // e.g. 'JOB_DAILY_OUTSTANDING_REMINDER'
  jobName: string;
  cronExpression: string; // '0 9 * * *'
  lastRunAt?: string;
  nextRunAt?: string;
  isActive: boolean;
}

export interface ApprovalWorkflow {
  id?: string;
  entityType: "INVOICE" | "QUOTATION" | "CASE_CLOSURE" | "DOCUMENT_DELETE";
  entityId: string;
  requestedBy: string;
  requesterName?: string;
  currentApproverRole: "MANAGER" | "REVIEWER" | "PARTNER" | "OWNER";
  status: "PENDING" | "APPROVED" | "REJECTED";
  remarks?: string;
  createdAt?: string;
}
