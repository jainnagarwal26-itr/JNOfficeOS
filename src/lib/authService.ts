/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 2: Authentication & Security Engine
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { AuthUser, UserRole } from "../types/auth";
import { permissionService } from "./permissionService";

export class AuthService {

  /**
   * Get current authenticated user profile
   */
  async getCurrentUser(): Promise<AuthUser | null> {
    if (!isSupabaseConfigured()) {
      return {
        id: "USR000001",
        userNumber: "USR000001",
        email: "jainnagarwal26@gmail.com",
        fullName: "Chirag Jain (Super Admin)",
        role: "OWNER",
        phone: "+91 9821482419",
        isActive: true,
        permissions: [
          "client.create", "client.update", "client.delete", "client.export",
          "invoice.create", "invoice.update", "invoice.delete", "invoice.print", "invoice.export",
          "case.assign", "case.close",
          "document.upload", "document.verify", "document.download",
          "staff.create", "staff.update", "staff.delete",
          "dashboard.view", "audit.view", "settings.update", "business_rules.manage"
        ]
      };
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: profile } = await supabase
        .from("jn_users")
        .select("*")
        .eq("email", user.email || "")
        .single();

      if (!profile) return null;

      const role = (profile.role || "STAFF") as UserRole;

      return {
        id: profile.id,
        userNumber: profile.user_number,
        email: profile.email,
        fullName: profile.full_name,
        role: role,
        phone: profile.phone || "",
        avatarUrl: profile.avatar_url || "",
        department: profile.department || "",
        designation: profile.designation || "",
        isActive: profile.is_active,
        lastLoginAt: profile.last_login_at || "",
        permissions: permissionService["rolePermissionsMap"][role] || []
      };
    } catch (err) {
      console.error("[AuthService] getCurrentUser error:", err);
      return null;
    }
  }

  async signOut(): Promise<void> {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
  }
}

export const authService = new AuthService();
