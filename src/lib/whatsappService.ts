/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Abstract WhatsApp Queue Engine
 */

import { queueService } from "./queueService";

export class WhatsappService {

  async queueWhatsappMessage(phone: string, templateCode: string, params: Record<string, any>): Promise<{ success: boolean; error?: string }> {
    return await queueService.enqueue("WHATSAPP", phone, {
      templateCode,
      params
    });
  }
}

export const whatsappService = new WhatsappService();
