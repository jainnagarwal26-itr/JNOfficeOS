/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 4: Case Timeline & Audit Event Logger
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { CaseTimelineEvent } from "../types/case";

export class TimelineService {

  async logEvent(event: CaseTimelineEvent): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from("jn_case_timeline").insert([{
        case_id: event.caseId,
        event_type: event.eventType,
        event_title: event.eventTitle,
        event_details: event.eventDetails || null,
        performed_by: event.performedBy || null
      }]);
    } catch (err) {
      console.error("[TimelineService] logEvent error:", err);
    }
  }

  async fetchTimeline(caseId: string): Promise<CaseTimelineEvent[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_case_timeline")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        caseId: row.case_id,
        eventType: row.event_type,
        eventTitle: row.event_title,
        eventDetails: row.event_details,
        performedBy: row.performed_by,
        createdAt: row.created_at
      }));
    } catch (err) {
      console.error("[TimelineService] fetchTimeline error:", err);
      return [];
    }
  }
}

export const timelineService = new TimelineService();
