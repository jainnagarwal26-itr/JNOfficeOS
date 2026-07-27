/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 2: Permission-Based Authorization Service
 */

import { AuthUser, PermissionCode, UserRole } from "../types/auth";
import { supabase, isSupabaseConfigured } from "./supabase";

export class PermissionService {
  private rolePermissionsMap: Record<UserRole, PermissionCode[]> = {
    OWNER: [
      "client.create", "client.update", "client.delete", "client.export",
      "invoice.create", "invoice.update", "invoice.delete", "invoice.print", "invoice.export",
      "case.assign", "case.close",
      "document.upload", "document.verify", "document.download",
      "staff.create", "staff.update", "staff.delete",
      "dashboard.view", "audit.view", "settings.update", "business_rules.manage"
    ],
    SUPER_ADMIN: [
      "client.create", "client.update", "client.delete", "client.export",
      "invoice.create", "invoice.update", "invoice.delete", "invoice.print", "invoice.export",
      "case.assign", "case.close",
      "document.upload", "document.verify", "document.download",
      "staff.create", "staff.update", "staff.delete",
      "dashboard.view", "audit.view", "settings.update", "business_rules.manage"
    ],
    ADMINISTRATOR: [
      "client.create", "client.update", "client.export",
      "invoice.create", "invoice.update", "invoice.print", "invoice.export",
      "case.assign", "case.close",
      "document.upload", "document.verify", "document.download",
      "staff.create", "staff.update",
      "dashboard.view", "audit.view"
    ],
    MANAGER: [
      "client.create", "client.update", "client.export",
      "invoice.create", "invoice.print",
      "case.assign", "case.close",
      "document.upload", "document.download",
      "dashboard.view"
    ],
    STAFF: [
      "client.create", "client.update",
      "invoice.create", "invoice.print",
      "document.upload", "document.download",
      "dashboard.view"
    ],
    AUDITOR: [
      "client.export",
      "invoice.print", "invoice.export",
      "document.download",
      "dashboard.view", "audit.view"
    ],
    CLIENT_PORTAL: [
      "dashboard.view", "document.download", "invoice.print"
    ],
    VENDOR_PORTAL: [
      "dashboard.view"
    ]
  };

  /**
   * Check if user possesses specific permission
   */
  hasPermission(user: AuthUser | null, permission: PermissionCode): boolean {
    if (!user) return false;
    if (user.role === "OWNER" || user.role === "SUPER_ADMIN") return true;

    if (user.permissions && user.permissions.includes(permission)) {
      return true;
    }

    const defaultRolePerms = this.rolePermissionsMap[user.role] || [];
    return defaultRolePerms.includes(permission);
  }

  /**
   * Check database level permission via PostgreSQL function `has_permission`
   */
  async verifyDatabasePermission(permissionCode: string): Promise<boolean> {
    if (!isSupabaseConfigured()) return true;

    try {
      const { data, error } = await supabase.rpc("has_permission", {
        p_permission_code: permissionCode
      });
      if (error) throw error;
      return Boolean(data);
    } catch (err) {
      console.error("[PermissionService] RPC error:", err);
      return false;
    }
  }
}

export const permissionService = new PermissionService();
