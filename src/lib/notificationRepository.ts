/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Notification Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { AppNotification, NotificationType, DeliveryChannel, User } from "../types";
import { EnterpriseNotification } from "../types/notification";

const STORAGE_KEY = "jn_officeos_notifications";

export class NotificationRepository {
  private static notificationsCache: AppNotification[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    const stored = typeof window !== "undefined" && typeof localStorage !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored) {
      try {
        this.notificationsCache = JSON.parse(stored);
      } catch (e) {
        console.error("Failed to parse stored notifications", e);
        this.notificationsCache = [];
      }
    } else {
      // Default Seed Notifications
      const now = new Date().toISOString();
      this.notificationsCache = [
        {
          id: "notif_seed_1",
          timestamp: now,
          type: "Warning",
          title: "GST Compliance Return Due Soon",
          message: "Monthly GSTR-3B filings for 3 active clients are due in 7 days.",
          channel: "Dashboard Alert",
          isRead: false,
          isArchived: false,
          priority: "High",
          targetUserId: "all"
        },
        {
          id: "notif_seed_2",
          timestamp: now,
          type: "Information",
          title: "System Synchronization Operational",
          message: "JN OfficeOS database connected with Supabase PostgreSQL backend.",
          channel: "In-App Notification",
          isRead: true,
          isArchived: false,
          priority: "Low",
          targetUserId: "all"
        }
      ];
    }
    this.isInitialized = true;
  }

  private static persist() {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notificationsCache));
    }
  }

  // --- STATIC METHODS FOR AUTOMATION HUB & DASHBOARD ---
  public static getNotifications(currentUser?: User): AppNotification[] {
    this.init();
    
    // Background sync with Supabase PostgreSQL
    this.syncFromSupabase(currentUser).catch(() => {});

    if (!currentUser) return this.notificationsCache;

    const isOwner = currentUser.role === "OWNER" || currentUser.role === "SUPERADMIN";
    if (isOwner) {
      return this.notificationsCache;
    }

    // STAFF User Filtering Rules:
    // ALL_STAFF messages -> visible to all active staff.
    // INDIVIDUAL STAFF messages -> visible ONLY to the specific targeted staff member.
    const userId = (currentUser.id || "").trim();
    const userNum = (currentUser.user_number || "").trim().toLowerCase();
    const email = (currentUser.email || "").trim().toLowerCase();
    const username = (currentUser.username || "").trim().toLowerCase();

    return this.notificationsCache.filter(n => {
      if (!n || n.isArchived) return false;

      const target = (n.targetUserId || "all").trim();

      // 1. Broadcast to All Staff
      if (target === "all" || target === "ALL_STAFF" || target === "ALL" || !target) {
        return true;
      }

      // 2. Confidential Owner Eyes Only
      if (target === "owner") {
        return false;
      }

      // 3. Direct Individual Staff Target (Matching Supabase UUID, User Number, Email, or Username)
      if (
        target === userId ||
        (userNum && target.toLowerCase() === userNum) ||
        (email && target.toLowerCase() === email) ||
        (username && target.toLowerCase() === username)
      ) {
        return true;
      }

      // 4. Do NOT render notifications targeted to another staff member
      return false;
    });
  }

  public static addNotification(
    notifInput: Omit<AppNotification, "id" | "timestamp" | "isRead" | "isArchived"> & Partial<AppNotification>,
    currentUser?: User
  ): AppNotification {
    this.init();

    const targetUserId = notifInput.targetUserId || "all";
    const isBroadcast = targetUserId === "all" || targetUserId === "ALL_STAFF" || targetUserId === "ALL";

    const newNotif: AppNotification = {
      id: notifInput.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: notifInput.timestamp || new Date().toISOString(),
      type: notifInput.type || "Information",
      title: notifInput.title || "Notification Alert",
      message: notifInput.message || "",
      channel: notifInput.channel || "In-App Notification",
      isRead: notifInput.isRead ?? false,
      isArchived: notifInput.isArchived ?? false,
      priority: notifInput.priority || "Medium",
      targetUserId: targetUserId,
      metadata: {
        targetType: isBroadcast ? "ALL_STAFF" : (targetUserId === "owner" ? "OWNER" : "STAFF"),
        targetUserId: isBroadcast ? null : targetUserId,
        broadcastedBy: currentUser?.fullName || currentUser?.name || "Owner",
        ...(notifInput.metadata || {})
      }
    };

    this.notificationsCache.unshift(newNotif);
    this.persist();

    // Async Supabase Sync to jn_notifications table
    if (isSupabaseConfigured()) {
      // Valid UUID check for recipient_id
      const isUuid = (id?: string) => Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
      const recipientUuid = isUuid(targetUserId) ? targetUserId : null;

      supabase
        .from("jn_notifications")
        .insert([{
          recipient_id: recipientUuid,
          notification_type: newNotif.type,
          title: newNotif.title,
          message: newNotif.message,
          is_read: newNotif.isRead,
          metadata: newNotif.metadata
        }])
        .then(({ error }) => {
          if (error) console.error("[NotificationRepository] Supabase insert error:", error);
        });
    }

    return newNotif;
  }

  public static markAsRead(id: string): void {
    this.init();
    const target = this.notificationsCache.find(n => n.id === id);
    if (target) {
      target.isRead = true;
      this.persist();

      if (isSupabaseConfigured()) {
        // Safe update by id if valid UUID
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUuid) {
          supabase
            .from("jn_notifications")
            .update({ is_read: true, read_at: new Date().toISOString() })
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error("[NotificationRepository] Supabase update error:", error);
            });
        }
      }
    }
  }

  public static markAllRead(): void {
    this.init();
    this.notificationsCache.forEach(n => { n.isRead = true; });
    this.persist();
  }

  public static archive(id: string): void {
    this.init();
    const target = this.notificationsCache.find(n => n.id === id);
    if (target) {
      target.isArchived = true;
      this.persist();
    }
  }

  public static archiveAll(): void {
    this.init();
    this.notificationsCache.forEach(n => { n.isArchived = true; });
    this.persist();
  }

  private static async syncFromSupabase(currentUser?: User) {
    if (!isSupabaseConfigured()) return;
    try {
      let query = supabase
        .from("jn_notifications")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (currentUser && currentUser.role === "STAFF") {
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(currentUser.id);
        if (isUuid) {
          query = query.or(`recipient_id.is.null,recipient_id.eq.${currentUser.id}`);
        }
      }

      const { data, error } = await query;
      if (error || !data) return;

      const mapped: AppNotification[] = data.map((row: any) => ({
        id: row.id,
        timestamp: row.created_at,
        type: row.notification_type || "Information",
        title: row.title,
        message: row.message,
        channel: row.channel || "In-App Notification",
        isRead: row.is_read || false,
        isArchived: false,
        priority: "High",
        targetUserId: row.recipient_id || "all",
        metadata: row.metadata || {}
      }));

      // Merge Supabase PostgreSQL notifications into local cache
      const existingIds = new Set(this.notificationsCache.map(n => n.id));
      for (const m of mapped) {
        if (!existingIds.has(m.id)) {
          this.notificationsCache.unshift(m);
        }
      }
      this.persist();
    } catch (e) {
      console.warn("[NotificationRepository] Supabase background sync failed:", e);
    }
  }

  // --- ASYNC INSTANCE METHODS FOR ENTERPRISE SERVICES ---
  async fetchUserNotifications(userId: string, isOwner: boolean = false): Promise<EnterpriseNotification[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_notifications")
        .select("*")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!isOwner) {
        query = query.or(`recipient_id.is.null,recipient_id.eq.${userId}`);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        recipientId: row.recipient_id,
        notificationType: row.notification_type,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        readAt: row.read_at,
        actionUrl: row.action_url,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error("[NotificationRepository] fetchUserNotifications error:", err);
      return [];
    }
  }

  async createNotification(n: EnterpriseNotification): Promise<{ success: boolean; data?: EnterpriseNotification; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        recipient_id: n.recipientId,
        notification_type: n.notificationType || "INFO",
        title: n.title,
        message: n.message,
        is_read: false,
        action_url: n.actionUrl || null
      };

      const { data, error } = await supabase
        .from("jn_notifications")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          recipientId: data.recipient_id,
          notificationType: data.notification_type,
          title: data.title,
          message: data.message,
          isRead: data.is_read,
          actionUrl: data.action_url,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[NotificationRepository] createNotification error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const notificationRepository = new NotificationRepository();
