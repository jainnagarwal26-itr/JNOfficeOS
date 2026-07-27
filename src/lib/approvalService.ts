/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Multi-Level Approval Chain Engine
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { ApprovalWorkflow } from "../types/automation";

export class ApprovalService {

  async createApprovalRequest(request: ApprovalWorkflow): Promise<{ success: boolean; data?: ApprovalWorkflow; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        entity_type: request.entityType,
        entity_id: request.entityId,
        requested_by: request.requestedBy,
        current_approver_role: request.currentApproverRole || "MANAGER",
        status: "PENDING",
        remarks: request.remarks || null
      };

      const { data, error } = await supabase
        .from("jn_approval_workflows")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          entityType: data.entity_type,
          entityId: data.entity_id,
          requestedBy: data.requested_by,
          currentApproverRole: data.current_approver_role,
          status: data.status,
          remarks: data.remarks,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[ApprovalService] createApprovalRequest error:", err);
      return { success: false, error: err.message };
    }
  }

  async updateApprovalStatus(approvalId: string, status: "APPROVED" | "REJECTED", remarks?: string): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase
        .from("jn_approval_workflows")
        .update({
          status,
          remarks: remarks || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", approvalId);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
}

export const approvalService = new ApprovalService();
