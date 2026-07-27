/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Notification Queue & Retry Engine
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { NotificationQueueItem, NotificationChannel } from "../types/notification";

export class QueueService {

  async enqueue(
    channel: NotificationChannel,
    recipientAddress: string,
    payload: Record<string, any>,
    notificationId?: string
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { data, error } = await supabase.from("jn_notification_queue").insert([{
        notification_id: notificationId || null,
        channel,
        recipient_address: recipientAddress,
        payload,
        status: "PENDING",
        retry_count: 0,
        max_retries: 3
      }]).select().single();

      if (error) throw error;
      return { success: true, queueId: data.id };
    } catch (err: any) {
      console.error("[QueueService] enqueue error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const queueService = new QueueService();
