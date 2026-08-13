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

      const userEmail = (user.email || "").toLowerCase().trim();
      let { data: profile } = await supabase
        .from("jn_users")
        .select("*")
        .eq("email", userEmail)
        .single();

      // Idempotent Reconciliation: If Supabase Auth account exists but jn_users profile missing, reconcile profile
      if (!profile) {
        console.warn(`[AuthService] Reconciling missing jn_users profile for auth user: ${userEmail}`);
        const isOwnerAccount = userEmail === "jainnagarwal26@gmail.com";
        const newProfile = {
          user_number: isOwnerAccount ? "STF000001" : "STF000002",
          email: userEmail,
          password_hash: "$2a$10$SupabaseAuthManagedIdentityHash",
          full_name: isOwnerAccount ? "Chirag Jain" : (user.user_metadata?.full_name || userEmail.split("@")[0]),
          role: isOwnerAccount ? "OWNER" : "STAFF",
          department: isOwnerAccount ? "Taxation" : "Administration",
          designation: isOwnerAccount ? "Managing CA & Owner" : "Staff Member",
          is_active: true,
          updated_at: new Date().toISOString()
        };

        const { data: inserted, error: insertErr } = await supabase
          .from("jn_users")
          .upsert(newProfile, { onConflict: "email" })
          .select("*")
          .single();

        if (insertErr) {
          console.error("[AuthService] Profile reconciliation error:", insertErr);
          return null;
        }

        profile = inserted;

        // Log audit event for reconciliation
        await supabase.from("jn_audit_logs").insert([{
          user_email: userEmail,
          user_name: profile.full_name,
          role: profile.role,
          action: "AUTH_PROFILE_RECONCILED",
          category: "AUTH",
          details: `Reconciled jn_users profile for authenticated Supabase user ID ${user.id}.`,
          ip_address: "127.0.0.1",
          created_at: new Date().toISOString()
        }]);
      }

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
