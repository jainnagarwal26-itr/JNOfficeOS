/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User, UserRole, StaffPermissions } from "../types";

/**
 * Checks if a user has permission to perform an action.
 * Owners always pass permissions checks.
 * Staff are checked against their specific assigned permission object.
 */
export function hasPermission(user: User | null, permissionKey: keyof StaffPermissions): boolean {
  if (!user) return false;
  if (user.status !== "ACTIVE") return false;
  
  // Owners and Administrators have automatic root bypass access to all capabilities
  if (
    user.role === UserRole.OWNER || 
    user.role === UserRole.ADMINISTRATOR || 
    String(user.role).toLowerCase() === "superadmin" || 
    String(user.role).toLowerCase() === "super_admin" || 
    String(user.role).toLowerCase() === "super admin"
  ) {
    return true;
  }

  // Auditors and Read-Only users are strictly confined to view-only capabilities
  if (user.role === UserRole.AUDITOR || user.role === UserRole.READ_ONLY) {
    return permissionKey.endsWith("View");
  }
  
  // Other roles (Staff, Manager, etc.) are evaluated dynamically
  if (permissionKey === "clientCrmEdit" && (user.role === UserRole.STAFF || String(user.role).toLowerCase() === "staff")) {
    return true;
  }
  
  if (!user.permissions) return true;
  return !!user.permissions[permissionKey];
}

/**
 * Gets a human-friendly label for a technical permission key.
 */
export function getPermissionLabel(key: keyof StaffPermissions): string {
  const labels: Record<keyof StaffPermissions, string> = {
    clientCrmView: "View Client Profiles & CRM",
    clientCrmEdit: "Create/Modify Client Profiles",
    serviceMasterView: "View Services Catalog",
    serviceMasterEdit: "Modify Services Catalog",
    invoiceView: "View Client Invoices",
    invoiceCreate: "Generate & Send Invoices",
    invoiceVoid: "Void or Delete Invoices",
    receiptView: "View Payments & Receipts",
    receiptCreate: "Record Received Payments",
    expenseView: "View Firm Expenses",
    expenseCreate: "Log New Office Expenses",
    reportsView: "Access Visual Reports & Financials",
    settingsView: "View Firm Configurations",
    settingsEdit: "Update Firm Settings & Bank Info",
    auditLogView: "Access System Activity Log",
    userManagementView: "View Users & Permission Panel",
    userManagementEdit: "Modify Staff Credentials & Access"
  };
  return labels[key] || String(key);
}

/**
 * Categorizes permissions for clean grouping in the Owner UI.
 */
export function getPermissionCategory(key: keyof StaffPermissions): "CLIENTS" | "BILLING" | "EXPENSES" | "ADMIN" {
  if (key.startsWith("client")) return "CLIENTS";
  if (key.startsWith("service") || key.startsWith("invoice") || key.startsWith("receipt") || key.startsWith("reports")) {
    return "BILLING";
  }
  if (key.startsWith("expense")) return "EXPENSES";
  return "ADMIN";
}
