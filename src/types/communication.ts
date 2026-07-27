/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: CRM Communication & Followup Types
 */

export type CommunicationType =
  | "Phone Call"
  | "Email"
  | "WhatsApp"
  | "Meeting"
  | "Site Visit";

export type FollowupType =
  | "Call Reminder"
  | "Meeting Reminder"
  | "Compliance Reminder"
  | "Renewal Reminder"
  | "Birthday Reminder";

export interface ClientCommunicationLog {
  id?: string;
  clientId: string;
  communicationType: CommunicationType;
  subject: string;
  summary: string;
  outcome?: string;
  communicatedAt?: string;
  performedBy?: string;
  attachmentUrls?: string[];
  status?: string;
  createdAt?: string;
}

export interface ClientFollowup {
  id?: string;
  clientId: string;
  followupType: FollowupType;
  title: string;
  notes?: string;
  dueDate: string;
  assignedTo?: string;
  status: "PENDING" | "COMPLETED" | "CANCELLED" | "OVERDUE";
  completedAt?: string;
  createdAt?: string;
}
