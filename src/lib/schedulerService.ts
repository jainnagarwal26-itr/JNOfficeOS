/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 8: Scheduler & Recurring Jobs Engine
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { SchedulerJob } from "../types/automation";

export class SchedulerService {

  async fetchActiveJobs(): Promise<SchedulerJob[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_scheduler_jobs")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        jobCode: row.job_code,
        jobName: row.job_name,
        cronExpression: row.cron_expression,
        lastRunAt: row.last_run_at,
        nextRunAt: row.next_run_at,
        isActive: row.is_active
      }));
    } catch (err) {
      console.error("[SchedulerService] fetchActiveJobs error:", err);
      return [];
    }
  }
}

export const schedulerService = new SchedulerService();
