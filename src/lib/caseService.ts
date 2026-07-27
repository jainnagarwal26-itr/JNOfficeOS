/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: High-Level Case & Workflow Service Engine
 */

import { EnterpriseCase, CaseStatus } from "../types/case";
import { caseRepository } from "./caseRepository";
import { workflowEngine } from "./workflowEngine";
import { timelineService } from "./timelineService";
import { databaseFoundationService } from "./databaseFoundationService";

export class CaseService {

  /**
   * Create a new engagement case with automatic business number sequence generation (CAS000001)
   */
  async createCase(caseData: Partial<EnterpriseCase>): Promise<{ success: boolean; data?: EnterpriseCase; error?: string }> {
    if (!caseData.clientId || !caseData.caseTitle) {
      return { success: false, error: "Client ID and Case Title are required." };
    }

    const caseNumber = caseData.caseNumber || await databaseFoundationService.getNextBusinessNumber("CASE");

    const newCase: EnterpriseCase = {
      caseNumber,
      clientId: caseData.clientId,
      serviceId: caseData.serviceId || "",
      caseTitle: caseData.caseTitle,
      category: caseData.category || "Consultation",
      status: caseData.status || "NOT_STARTED",
      priority: caseData.priority || "Medium",
      dueDate: caseData.dueDate || "",
      estimatedHours: caseData.estimatedHours || 0,
      feeAmount: caseData.feeAmount || 0,
      financialYear: caseData.financialYear || "2026-27",
      remarks: caseData.remarks || ""
    };

    const res = await caseRepository.saveCase(newCase);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    if (res.data?.id) {
      await timelineService.logEvent({
        caseId: res.data.id,
        eventType: "CASE_CREATED",
        eventTitle: `Case ${caseNumber} Created: ${caseData.caseTitle}`
      });
    }

    return { success: true, data: res.data };
  }

  /**
   * Transition case status validated by Workflow Engine
   */
  async updateCaseStatus(caseData: EnterpriseCase, targetStatus: CaseStatus): Promise<{ success: boolean; error?: string }> {
    const transitionCheck = workflowEngine.canTransition(caseData.status, targetStatus);
    if (!transitionCheck.allowed) {
      return { success: false, error: transitionCheck.reason };
    }

    const updatedCase: EnterpriseCase = {
      ...caseData,
      status: targetStatus
    };

    const res = await caseRepository.saveCase(updatedCase);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    if (caseData.id) {
      await timelineService.logEvent({
        caseId: caseData.id,
        eventType: "STATUS_CHANGE",
        eventTitle: `Status Changed from '${caseData.status}' to '${targetStatus}'`
      });
    }

    return { success: true };
  }
}

export const caseService = new CaseService();
