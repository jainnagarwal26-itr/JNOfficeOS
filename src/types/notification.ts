/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Notifications & Alerts Types
 */

export type NotificationType =
  | "INFO"
  | "SUCCESS"
  | "WARNING"
  | "ERROR"
  | "CRITICAL"
  | "REMINDER"
  | "APPROVAL_REQUEST"
  | "COMPLIANCE_ALERT";

export type NotificationChannel =
  | "IN_APP"
  | "EMAIL"
  | "WHATSAPP"
  | "SMS"
  | "PUSH";

export type QueueStatus =
  | "PENDING"
  | "PROCESSING"
  | "DELIVERED"
  | "FAILED"
  | "RETRYING"
  | "CANCELLED";

export interface NotificationTemplate {
  id?: string;
  templateCode: string; // e.g. 'CASE_ASSIGNED', 'INVOICE_GENERATED'
  templateName: string;
  channel: NotificationChannel;
  subjectTemplate?: string;
  bodyTemplate: string;
  placeholders: string[];
  isActive: boolean;
}

export interface EnterpriseNotification {
  id?: string;
  recipientId: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: string;
  actionUrl?: string;
  createdAt?: string;
}

export interface NotificationQueueItem {
  id?: string;
  notificationId?: string;
  channel: NotificationChannel;
  recipientAddress: string;
  payload: Record<string, any>;
  status: QueueStatus;
  retryCount: number;
  maxRetries: number;
  errorMessage?: string;
  scheduledAt?: string;
  processedAt?: string;
  createdAt?: string;
}
