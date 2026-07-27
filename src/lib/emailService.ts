/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Abstract Email Queue & Provider Engine
 */

import { queueService } from "./queueService";

export class EmailService {

  async queueEmail(to: string, subject: string, htmlBody: string, attachments?: string[]): Promise<{ success: boolean; error?: string }> {
    return await queueService.enqueue("EMAIL", to, {
      subject,
      htmlBody,
      attachments: attachments || []
    });
  }
}

export const emailService = new EmailService();
