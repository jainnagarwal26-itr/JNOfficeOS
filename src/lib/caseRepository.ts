/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Case Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { EnterpriseCase } from "../types/case";

export class CaseRepository {

  async fetchAllCases(options?: { status?: string; category?: string }): Promise<EnterpriseCase[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      let query = supabase
        .from("jn_cases")
        .select(`
          *,
          client:jn_clients(client_name, client_number),
          tasks:jn_case_tasks(*),
          time_entries:jn_case_time_entries(*)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (options?.status && options.status !== "ALL") {
        query = query.eq("status", options.status);
      }

      if (options?.category && options.category !== "ALL") {
        query = query.eq("category", options.category);
      }

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        caseNumber: row.case_number,
        clientId: row.client_id,
        clientName: row.client?.client_name || "",
        clientNumber: row.client?.client_number || "",
        serviceId: row.service_id || "",
        caseTitle: row.case_title,
        category: row.category,
        status: row.status,
        priority: row.priority,
        dueDate: row.due_date || "",
        estimatedHours: row.estimated_hours || 0,
        actualHours: row.actual_hours || 0,
        feeAmount: row.fee_amount || 0,
        financialYear: row.financial_year || "2026-27",
        remarks: row.remarks || "",
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        tasks: (row.tasks || []).map((t: any) => ({
          id: t.id,
          caseId: t.case_id,
          taskTitle: t.task_title,
          isCompleted: t.is_completed,
          dueDate: t.due_date,
          assignedTo: t.assigned_to
        }))
      }));
    } catch (err) {
      console.error("[CaseRepository] fetchAllCases error:", err);
      return [];
    }
  }

  async saveCase(caseData: EnterpriseCase): Promise<{ success: boolean; data?: EnterpriseCase; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        case_number: caseData.caseNumber,
        client_id: caseData.clientId,
        service_id: caseData.serviceId || null,
        case_title: caseData.caseTitle,
        category: caseData.category,
        status: caseData.status,
        priority: caseData.priority,
        due_date: caseData.dueDate || null,
        estimated_hours: caseData.estimatedHours || 0,
        actual_hours: caseData.actualHours || 0,
        fee_amount: caseData.feeAmount || 0,
        financial_year: caseData.financialYear || "2026-27",
        remarks: caseData.remarks || null,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_cases")
        .upsert(payload, { onConflict: "case_number" })
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          caseNumber: data.case_number,
          clientId: data.client_id,
          serviceId: data.service_id,
          caseTitle: data.case_title,
          category: data.category,
          status: data.status,
          priority: data.priority,
          dueDate: data.due_date,
          estimatedHours: data.estimated_hours,
          actualHours: data.actual_hours,
          feeAmount: data.fee_amount,
          financialYear: data.financial_year,
          remarks: data.remarks,
          createdAt: data.created_at,
          updatedAt: data.updated_at
        }
      };
    } catch (err: any) {
      console.error("[CaseRepository] saveCase error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const caseRepository = new CaseRepository();
