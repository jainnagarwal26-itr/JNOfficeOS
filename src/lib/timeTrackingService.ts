/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Case Time Tracking & Hours Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { CaseTimeEntry } from "../types/case";
import { timelineService } from "./timelineService";

export class TimeTrackingService {

  async logTimeEntry(entry: CaseTimeEntry): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase.from("jn_case_time_entries").insert([{
        case_id: entry.caseId,
        user_id: entry.userId,
        task_id: entry.taskId || null,
        description: entry.description,
        hours_spent: entry.hoursSpent,
        is_billable: entry.isBillable ?? true,
        hourly_rate: entry.hourlyRate || 0,
        start_time: entry.startTime || null,
        end_time: entry.endTime || null
      }]);

      if (error) throw error;

      await timelineService.logEvent({
        caseId: entry.caseId,
        eventType: "TIME_LOGGED",
        eventTitle: `Logged ${entry.hoursSpent} hrs: ${entry.description}`,
        performedBy: entry.userId
      });

      return { success: true };
    } catch (err: any) {
      console.error("[TimeTrackingService] logTimeEntry error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const timeTrackingService = new TimeTrackingService();
