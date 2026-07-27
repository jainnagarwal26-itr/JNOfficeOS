/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - V2.1 Phase 1: AI Repository Access Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { AIConversation, AIMessage, AIAuditLog } from "../types/ai";

export class AIRepository {

  async fetchUserConversations(userId: string): Promise<AIConversation[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_ai_conversations")
        .select(`
          *,
          messages:jn_ai_messages(*)
        `)
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      return (data || []).map((row: any) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        contextType: row.context_type,
        contextId: row.context_id,
        isPinned: row.is_pinned,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        messages: (row.messages || []).map((m: any) => ({
          id: m.id,
          conversationId: m.conversation_id,
          senderRole: m.sender_role,
          messageContent: m.message_content,
          tokenCount: m.token_count,
          modelUsed: m.model_used,
          createdAt: m.created_at
        }))
      }));
    } catch (err) {
      console.error("[AIRepository] fetchUserConversations error:", err);
      return [];
    }
  }

  async saveConversation(conv: AIConversation): Promise<{ success: boolean; data?: AIConversation; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured" };

    try {
      const payload: any = {
        user_id: conv.userId,
        title: conv.title || "New Conversation",
        context_type: conv.contextType || "GENERAL",
        context_id: conv.contextId || null,
        is_pinned: conv.isPinned || false,
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from("jn_ai_conversations")
        .insert([payload])
        .select()
        .single();

      if (error) throw error;

      return {
        success: true,
        data: {
          id: data.id,
          userId: data.user_id,
          title: data.title,
          contextType: data.context_type,
          contextId: data.context_id,
          isPinned: data.is_pinned,
          createdAt: data.created_at
        }
      };
    } catch (err: any) {
      console.error("[AIRepository] saveConversation error:", err);
      return { success: false, error: err.message };
    }
  }

  async logAIAudit(log: AIAuditLog): Promise<void> {
    if (!isSupabaseConfigured()) return;

    try {
      await supabase.from("jn_ai_audit_logs").insert([{
        user_id: log.userId,
        model_code: log.modelCode,
        prompt_text: log.promptText,
        response_text: log.responseText || null,
        prompt_tokens: log.promptTokens || 0,
        completion_tokens: log.completionTokens || 0,
        latency_ms: log.latencyMs || 0,
        estimated_cost_usd: log.estimatedCostUsd || 0,
        status: log.status || "SUCCESS",
        error_message: log.errorMessage || null
      }]);
    } catch (err) {
      console.error("[AIRepository] logAIAudit error:", err);
    }
  }
}

export const aiRepository = new AIRepository();
