/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: High-Level Notification & Alerts Service Engine
 */

import { EnterpriseNotification } from "../types/notification";
import { notificationRepository } from "./notificationRepository";
import { emailService } from "./emailService";

export class NotificationService {

  /**
   * Dispatch system notification and multi-channel queues
   */
  async sendNotification(
    recipientId: string,
    title: string,
    message: string,
    options?: { type?: string; actionUrl?: string; email?: string }
  ): Promise<{ success: boolean; data?: EnterpriseNotification; error?: string }> {

    const newNotif: EnterpriseNotification = {
      recipientId,
      notificationType: (options?.type || "INFO") as any,
      title,
      message,
      isRead: false,
      actionUrl: options?.actionUrl || ""
    };

    const res = await notificationRepository.createNotification(newNotif);

    if (options?.email) {
      await emailService.queueEmail(options.email, title, `<p>${message}</p>`);
    }

    return res;
  }
}

export const notificationService = new NotificationService();
