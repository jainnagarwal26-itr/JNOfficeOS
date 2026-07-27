/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module 3: Client Communication & Followup Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { ClientCommunicationLog, ClientFollowup } from "../types/communication";

export class CommunicationService {

  async logCommunication(log: ClientCommunicationLog): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase.from("jn_client_communication").insert([{
        client_id: log.clientId,
        communication_type: log.communicationType,
        subject: log.subject,
        summary: log.summary,
        outcome: log.outcome || null,
        status: log.status || "COMPLETED"
      }]);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[CommunicationService] logCommunication error:", err);
      return { success: false, error: err.message };
    }
  }

  async createFollowup(followup: ClientFollowup): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: true };

    try {
      const { error } = await supabase.from("jn_client_followups").insert([{
        client_id: followup.clientId,
        followup_type: followup.followupType,
        title: followup.title,
        notes: followup.notes || null,
        due_date: followup.dueDate,
        status: followup.status || "PENDING"
      }]);

      if (error) throw error;
      return { success: true };
    } catch (err: any) {
      console.error("[CommunicationService] createFollowup error:", err);
      return { success: false, error: err.message };
    }
  }
}

export const communicationService = new CommunicationService();
