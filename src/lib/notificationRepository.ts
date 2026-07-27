/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Notification Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { AppNotification, NotificationType, DeliveryChannel } from "../types";
import { EnterpriseNotification } from "../types/notification";

const STORAGE_KEY = "jn_officeos_notifications";

export class NotificationRepository {
  private static notificationsCache: AppNotification[] = [];
  private static isInitialized = false;

  private static init() {
    if (this.isInitialized) return;
    const stored = localStorage.getItem(STORAGE_KEY);
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.notificationsCache));
  }

  // --- STATIC METHODS FOR AUTOMATION HUB ---
  public static getNotifications(): AppNotification[] {
    this.init();
    return this.notificationsCache;
  }

  public static addNotification(notifInput: Omit<AppNotification, "id" | "timestamp" | "isRead" | "isArchived"> & Partial<AppNotification>): AppNotification {
    this.init();
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
      targetUserId: notifInput.targetUserId || "all",
      metadata: notifInput.metadata
    };

    this.notificationsCache.unshift(newNotif);
    this.persist();

    // Async Supabase Sync
    if (isSupabaseConfigured()) {
      supabase
        .from("jn_notifications")
        .insert([{
          recipient_id: newNotif.targetUserId,
          notification_type: newNotif.type,
          title: newNotif.title,
          message: newNotif.message,
          is_read: newNotif.isRead
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

  public static archive(id: string): void {
    this.init();
    const target = this.notificationsCache.find(n => n.id === id);
    if (target) {
      target.isArchived = true;
      this.persist();
    }
  }

  // --- ASYNC INSTANCE METHODS FOR ENTERPRISE SERVICES ---
  async fetchUserNotifications(userId: string): Promise<EnterpriseNotification[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_notifications")
        .select("*")
        .eq("recipient_id", userId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(50);

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
