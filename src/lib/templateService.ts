/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 7: Notification Template Engine
 */

export class TemplateService {

  /**
   * Replace template placeholders like {{client_name}}, {{case_number}}, {{amount}}, {{due_date}}
   */
  renderTemplate(templateText: string, variables: Record<string, any>): string {
    if (!templateText) return "";

    let rendered = templateText;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, "g");
      rendered = rendered.replace(regex, String(variables[key] ?? ""));
    });

    return rendered;
  }
}

export const templateService = new TemplateService();
