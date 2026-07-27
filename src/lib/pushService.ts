/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Abstract Push Notifications Engine
 */

import { queueService } from "./queueService";

export class PushService {

  async queuePushNotification(token: string, title: string, body: string, dataPayload?: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    return await queueService.enqueue("PUSH", token, {
      title,
      body,
      dataPayload: dataPayload || {}
    });
  }
}

export const pushService = new PushService();
