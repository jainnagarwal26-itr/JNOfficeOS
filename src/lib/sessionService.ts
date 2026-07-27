/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 2: Session Management & Security Events Service
 */

import { UserSession, SecurityEvent } from "../types/auth";
import { supabase, isSupabaseConfigured } from "./supabase";

export class SessionService {

  async fetchActiveSessions(userId: string): Promise<UserSession[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_login_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("is_revoked", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        sessionToken: row.session_token,
        deviceName: row.device_name || "Unknown Device",
        browserName: row.browser_name || "Browser",
        operatingSystem: row.operating_system || "OS",
        ipAddress: row.ip_address || "127.0.0.1",
        isRevoked: row.is_revoked,
        lastActivityAt: row.last_activity_at,
        expiresAt: row.expires_at,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error("[SessionService] fetchActiveSessions error:", err);
      return [];
    }
  }

  async revokeSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase
        .from("jn_login_sessions")
        .update({ is_revoked: true })
        .eq("id", sessionId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  async logSecurityEvent(event: Omit<SecurityEvent, "id" | "createdAt">): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from("jn_security_events").insert([{
        event_type: event.eventType,
        severity: event.severity,
        user_id: event.userId || null,
        user_email: event.userEmail || null,
        ip_address: event.ipAddress || null,
        event_details: event.eventDetails
      }]);
    } catch (err) {
      console.error("[SessionService] logSecurityEvent error:", err);
    }
  }
}

export const sessionService = new SessionService();
