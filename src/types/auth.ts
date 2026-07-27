/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 2: Security & Authentication Type Catalog
 */

export type UserRole =
  | "OWNER"
  | "SUPER_ADMIN"
  | "ADMINISTRATOR"
  | "MANAGER"
  | "STAFF"
  | "AUDITOR"
  | "CLIENT_PORTAL"
  | "VENDOR_PORTAL";

export type PermissionCode =
  | "client.create"
  | "client.update"
  | "client.delete"
  | "client.export"
  | "invoice.create"
  | "invoice.update"
  | "invoice.delete"
  | "invoice.print"
  | "invoice.export"
  | "case.assign"
  | "case.close"
  | "document.upload"
  | "document.verify"
  | "document.download"
  | "staff.create"
  | "staff.update"
  | "staff.delete"
  | "dashboard.view"
  | "audit.view"
  | "settings.update"
  | "business_rules.manage";

export interface AuthUser {
  id: string;
  userNumber: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone?: string;
  avatarUrl?: string;
  department?: string;
  designation?: string;
  isActive: boolean;
  lastLoginAt?: string;
  permissions: PermissionCode[];
}

export interface UserSession {
  id: string;
  userId: string;
  sessionToken: string;
  deviceName: string;
  browserName: string;
  operatingSystem: string;
  ipAddress: string;
  isRevoked: boolean;
  lastActivityAt: string;
  expiresAt: string;
  createdAt: string;
}

export interface SecurityEvent {
  id: string;
  eventType: string;
  severity: "Low" | "Medium" | "High" | "Critical" | "Urgent";
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  eventDetails: Record<string, any>;
  createdAt: string;
}
