/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Case Task Management Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { CaseTask } from "../types/case";
import { timelineService } from "./timelineService";

export class TaskService {

  async createTask(task: CaseTask): Promise<{ success: boolean; data?: CaseTask; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const { data, error } = await supabase
        .from("jn_case_tasks")
        .insert([{
          case_id: task.caseId,
          task_title: task.taskTitle,
          is_completed: task.isCompleted || false,
          due_date: task.dueDate || null,
          assigned_to: task.assignedTo || null
        }])
        .select()
        .single();

      if (error) throw error;

      await timelineService.logEvent({
        caseId: task.caseId,
        eventType: "TASK_CREATED",
        eventTitle: `Task Created: ${task.taskTitle}`
      });

      return {
        success: true,
        data: {
          id: data.id,
          caseId: data.case_id,
          taskTitle: data.task_title,
          isCompleted: data.is_completed,
          dueDate: data.due_date,
          assignedTo: data.assigned_to,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[TaskService] createTask error:", err);
      return { success: false, error: err.message };
    }
  }

  async toggleTaskCompletion(taskId: string, caseId: string, isCompleted: boolean): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase
        .from("jn_case_tasks")
        .update({
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : null,
          updated_at: new Date().toISOString()
        })
        .eq("id", taskId);

      await timelineService.logEvent({
        caseId,
        eventType: "TASK_COMPLETED",
        eventTitle: isCompleted ? "Task Marked Complete" : "Task Reopened"
      });
    } catch (err) {
      console.error("[TaskService] toggleTaskCompletion error:", err);
    }
  }
}

export const taskService = new TaskService();
