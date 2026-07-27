/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface ClientPortalUser {
  id: string;
  clientId: string;
  email: string;
  passwordHash?: string;
  status: "ACTIVE" | "SUSPENDED" | "PENDING";
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSession {
  id: string;
  sessionId: string;
  portalUserId: string;
  clientId: string;
  deviceInfo?: string;
  ipAddress?: string;
  expiresAt: string;
  createdAt: string;
}

export interface ClientRequest {
  id: string;
  requestId: string;
  clientId: string;
  requestType: "ITR_FILING" | "GST_COMPLIANCE" | "LOAN_DOCUMENTS" | "COMPLIANCE_QUERY" | "OTHER";
  subject: string;
  description: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";
  assignedStaffId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClientAppointment {
  id: string;
  appointmentId: string;
  clientId: string;
  subject: string;
  scheduledAt: string;
  durationMins: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "RESCHEDULED";
  meetingLink?: string;
  notes?: string;
  createdAt: string;
}

export interface ClientPortalMessage {
  id: string;
  messageId: string;
  clientId: string;
  senderType: "CLIENT" | "STAFF" | "SYSTEM";
  senderName: string;
  messageText: string;
  attachments?: any[];
  isRead: boolean;
  createdAt: string;
}

export interface ClientActivityLog {
  id: string;
  logId: string;
  clientId: string;
  action: string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
}

export interface ClientDashboardData {
  clientId: string;
  clientName: string;
  tradeName?: string;
  email?: string;
  mobile?: string;
  pan?: string;
  gstin?: string;
  profileCompletionPercent: number;
  outstandingBalance: number;
  totalBilled: number;
  totalPaid: number;
  pendingTasksCount: number;
  activeDocumentsCount: number;
  recentInvoices: any[];
  recentDocuments: any[];
  recentRequests: ClientRequest[];
  upcomingAppointments: ClientAppointment[];
}
