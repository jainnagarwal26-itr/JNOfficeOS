/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Case & Workflow Management Types
 */

export type CaseStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "PENDING_CLIENT_DOCS"
  | "UNDER_REVIEW"
  | "FILED_COMPLETED"
  | "ON_HOLD"
  | "CANCELLED";

export type CasePriority = "Low" | "Medium" | "High" | "Critical" | "Urgent";

export interface CaseTask {
  id?: string;
  caseId: string;
  taskTitle: string;
  isCompleted: boolean;
  dueDate?: string;
  assignedTo?: string;
  completedAt?: string;
  createdAt?: string;
}

export interface CaseComment {
  id?: string;
  caseId: string;
  userId: string;
  userName?: string;
  commentText: string;
  isInternal: boolean;
  attachmentUrls?: string[];
  createdAt?: string;
}

export interface CaseTimelineEvent {
  id?: string;
  caseId: string;
  eventType: string; // 'CASE_CREATED', 'ASSIGNED', 'STATUS_CHANGE', 'TASK_COMPLETED', 'COMMENT_ADDED', 'TIME_LOGGED', 'CLOSED'
  eventTitle: string;
  eventDetails?: Record<string, any>;
  performedBy?: string;
  createdAt?: string;
}

export interface CaseTimeEntry {
  id?: string;
  caseId: string;
  userId: string;
  taskId?: string;
  description: string;
  hoursSpent: number;
  isBillable: boolean;
  hourlyRate?: number;
  startTime?: string;
  endTime?: string;
  createdAt?: string;
}

export interface EnterpriseCase {
  id?: string;
  caseNumber: string; // e.g. CAS000001
  clientId: string;
  clientName?: string;
  clientNumber?: string;
  serviceId?: string;
  caseTitle: string;
  category: string; // 'Income Tax Return', 'GST Return', 'Audit', 'ROC Filing', 'Company Incorporation'
  status: CaseStatus;
  priority: CasePriority;
  dueDate?: string;
  estimatedHours?: number;
  actualHours?: number;
  feeAmount?: number;
  financialYear?: string;
  remarks?: string;

  assignedStaffIds?: string[];
  tasks?: CaseTask[];
  comments?: CaseComment[];
  timeline?: CaseTimelineEvent[];
  timeEntries?: CaseTimeEntry[];

  versionNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}
