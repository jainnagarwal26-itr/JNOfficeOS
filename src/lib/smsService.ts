/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Abstract SMS Queue Engine
 */

import { queueService } from "./queueService";

export class SmsService {

  async queueSms(phone: string, message: string): Promise<{ success: boolean; error?: string }> {
    return await queueService.enqueue("SMS", phone, {
      message
    });
  }
}

export const smsService = new SmsService();
