/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module A: Private Staff Chat Repository Layer
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { User, UserRole } from "../types";
import { addAuditLog } from "./db";

export interface PrivateChat {
  id: string;
  participantOneId: string;
  participantTwoId: string;
  otherParticipantName?: string;
  otherParticipantNumber?: string;
  otherParticipantDesignation?: string;
  otherParticipantRole?: string;
  otherParticipantEmail?: string;
  lastMessageAt: string;
  lastMessagePreview?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrivateChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName?: string;
  messageText: string;
  createdAt: string;
  isRead?: boolean;
  readAt?: string | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  deletedReason?: string | null;
}

export interface StaffChatDirectoryUser {
  id: string;
  fullName: string;
  userNumber: string;
  email: string;
  role: string;
  department?: string;
  designation?: string;
  isActive: boolean;
}

export class PrivateChatRepository {

  /**
   * Resolve user UUID from user object or ID
   */
  public static resolveUuid(userOrId: User | string): string {
    const OWNER_UUID = "57235de4-9fc6-42a5-86f3-df2dbb4506f7";
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (typeof userOrId === "object" && userOrId !== null) {
      if (userOrId.id && isUuid.test(userOrId.id)) return userOrId.id;
      if (userOrId.email?.toLowerCase().includes("jainnagarwal26") || userOrId.role === UserRole.OWNER) return OWNER_UUID;
      if (userOrId.email?.toLowerCase().includes("amit")) return "06158e82-8257-442d-8769-11e2c8292b62";
      if (userOrId.email?.toLowerCase().includes("shruti")) return "ce9ce252-fce5-4d4b-be2b-bf96349027a6";
      if (userOrId.email?.toLowerCase().includes("anju")) return "40f4a361-359b-473e-9f5e-98545068e16c";
      return OWNER_UUID;
    }

    if (typeof userOrId === "string") {
      if (isUuid.test(userOrId)) return userOrId;
      if (userOrId === "usr_owner_001" || userOrId.includes("chirag") || userOrId.includes("jainnagarwal26")) return OWNER_UUID;
      if (userOrId.includes("amit")) return "06158e82-8257-442d-8769-11e2c8292b62";
      if (userOrId.includes("shruti")) return "ce9ce252-fce5-4d4b-be2b-bf96349027a6";
      if (userOrId.includes("anju")) return "40f4a361-359b-473e-9f5e-98545068e16c";
    }

    return OWNER_UUID;
  }

  /**
   * Fetch active staff directory for chat from jn_users
   */
  public static async getStaffDirectory(currentUser: User): Promise<StaffChatDirectoryUser[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data, error } = await supabase
        .from("jn_users")
        .select("id, full_name, user_number, email, role, department, designation, is_active")
        .eq("is_active", true)
        .order("user_number", { ascending: true });

      if (error || !data) return [];

      const currentUuid = this.resolveUuid(currentUser);
      const isOwner = currentUser.role === UserRole.OWNER || currentUser.role === "SUPERADMIN" || currentUser.email.toLowerCase().includes("jainnagarwal26");

      return data
        .map(u => ({
          id: u.id,
          fullName: u.full_name,
          userNumber: u.user_number || "STF000",
          email: u.email,
          role: u.role,
          department: u.department,
          designation: u.designation || (u.role === "OWNER" ? "Managing CA & Owner" : "Staff Member"),
          isActive: u.is_active
        }))
        .filter(u => {
          // If Owner, show all staff members (excluding Owner self)
          if (isOwner) {
            return u.id !== currentUuid && (u.role !== "OWNER" && u.role !== "SUPERADMIN");
          }
          // If Staff, show ONLY the Super Admin / Owner
          return u.role === "OWNER" || u.role === "SUPERADMIN" || u.email.toLowerCase().includes("jainnagarwal26");
        });
    } catch (e) {
      console.error("[PrivateChatRepository] Error getting staff directory:", e);
      return [];
    }
  }

  /**
   * Get or create a 1-to-1 private chat between two users idempotently
   */
  public static async getOrCreatePrivateChat(currentUserId: string, targetUserId: string): Promise<{ success: boolean; chat?: PrivateChat; error?: string }> {
    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase connection is not configured." };
    }

    try {
      const p1 = currentUserId < targetUserId ? currentUserId : targetUserId;
      const p2 = currentUserId < targetUserId ? targetUserId : currentUserId;

      // 1. Check if chat already exists
      const { data: existing, error: fetchErr } = await supabase
        .from("jn_private_chats")
        .select("*")
        .eq("participant_one_id", p1)
        .eq("participant_two_id", p2)
        .limit(1);

      if (!fetchErr && existing && existing.length > 0) {
        const row = existing[0];
        return {
          success: true,
          chat: {
            id: row.id,
            participantOneId: row.participant_one_id,
            participantTwoId: row.participant_two_id,
            lastMessageAt: row.last_message_at,
            lastMessagePreview: row.last_message_preview,
            isActive: row.is_active,
            createdAt: row.created_at,
            updatedAt: row.updated_at
          }
        };
      }

      // 2. Create new chat record
      const { data: created, error: createErr } = await supabase
        .from("jn_private_chats")
        .insert([{
          participant_one_id: p1,
          participant_two_id: p2,
          last_message_at: new Date().toISOString(),
          last_message_preview: "Conversation started",
          is_active: true
        }])
        .select()
        .single();

      if (createErr) throw createErr;

      return {
        success: true,
        chat: {
          id: created.id,
          participantOneId: created.participant_one_id,
          participantTwoId: created.participant_two_id,
          lastMessageAt: created.last_message_at,
          lastMessagePreview: created.last_message_preview,
          isActive: created.is_active,
          createdAt: created.created_at,
          updatedAt: created.updated_at
        }
      };
    } catch (err: any) {
      console.error("[PrivateChatRepository] Error in getOrCreatePrivateChat:", err);
      return { success: false, error: err.message || "Failed to initialize private chat." };
    }
  }

  /**
   * Get all active private chats for the current user with enriched participant info
   */
  public static async getMyPrivateChats(currentUser: User): Promise<PrivateChat[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const currentUuid = this.resolveUuid(currentUser);
      const isOwner = currentUser.role === UserRole.OWNER || currentUser.role === "SUPERADMIN" || currentUser.email.toLowerCase().includes("jainnagarwal26");

      // Query chats where user is participant
      let query = supabase
        .from("jn_private_chats")
        .select("*")
        .eq("is_active", true)
        .order("last_message_at", { ascending: false });

      if (!isOwner) {
        query = query.or(`participant_one_id.eq.${currentUuid},participant_two_id.eq.${currentUuid}`);
      }

      const { data: chats, error } = await query;
      if (error || !chats) return [];

      // Fetch all users to map names and designations
      const { data: allUsers } = await supabase
        .from("jn_users")
        .select("id, full_name, user_number, designation, role, email");

      const userMap = new Map<string, any>();
      (allUsers || []).forEach(u => userMap.set(u.id, u));

      return chats.map(c => {
        const otherId = c.participant_one_id === currentUuid ? c.participant_two_id : c.participant_one_id;
        const otherUser = userMap.get(otherId);

        return {
          id: c.id,
          participantOneId: c.participant_one_id,
          participantTwoId: c.participant_two_id,
          otherParticipantName: otherUser?.full_name || "Staff Member",
          otherParticipantNumber: otherUser?.user_number || "STF",
          otherParticipantDesignation: otherUser?.designation || (otherUser?.role === "OWNER" ? "Managing CA & Owner" : "Staff"),
          otherParticipantRole: otherUser?.role || "STAFF",
          otherParticipantEmail: otherUser?.email || "",
          lastMessageAt: c.last_message_at,
          lastMessagePreview: c.last_message_preview || "No messages yet",
          isActive: c.is_active,
          createdAt: c.created_at,
          updatedAt: c.updated_at
        };
      });
    } catch (e) {
      console.error("[PrivateChatRepository] Error in getMyPrivateChats:", e);
      return [];
    }
  }

  /**
   * Fetch all messages for a specific private chat
   */
  public static async getChatMessages(chatId: string): Promise<PrivateChatMessage[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data: messages, error } = await supabase
        .from("jn_private_chat_messages")
        .select("*")
        .eq("chat_id", chatId)
        .is("deleted_at", null)
        .order("created_at", { ascending: true });

      if (error || !messages) return [];

      // Fetch senders for full name display
      const { data: allUsers } = await supabase.from("jn_users").select("id, full_name");
      const nameMap = new Map<string, string>();
      (allUsers || []).forEach(u => nameMap.set(u.id, u.full_name));

      return messages.map(m => ({
        id: m.id,
        chatId: m.chat_id,
        senderId: m.sender_id,
        senderName: nameMap.get(m.sender_id) || "Staff",
        messageText: m.message_text,
        createdAt: m.created_at,
        isRead: m.is_read || false,
        readAt: m.read_at || null,
        deletedAt: m.deleted_at,
        deletedBy: m.deleted_by,
        deletedReason: m.deleted_reason
      }));
    } catch (e) {
      console.error("[PrivateChatRepository] Error getting messages:", e);
      return [];
    }
  }

  /**
   * Send a private text message
   */
  public static async sendMessage(
    chatId: string,
    sender: User | string,
    messageText: string
  ): Promise<{ success: boolean; message?: PrivateChatMessage; error?: string }> {
    if (!messageText || !messageText.trim()) {
      return { success: false, error: "Message text cannot be empty." };
    }

    if (!isSupabaseConfigured()) {
      return { success: false, error: "Supabase connection is not available." };
    }

    try {
      const senderUuid = this.resolveUuid(sender);
      const trimmed = messageText.trim();
      const now = new Date().toISOString();

      // 1. Insert message
      const { data: msgData, error: msgErr } = await supabase
        .from("jn_private_chat_messages")
        .insert([{
          chat_id: chatId,
          sender_id: senderUuid,
          message_text: trimmed,
          created_at: now
        }])
        .select()
        .single();

      if (msgErr) throw msgErr;

      // 2. Update chat's last message timestamp and preview
      const preview = trimmed.length > 60 ? trimmed.substring(0, 57) + "..." : trimmed;
      await supabase
        .from("jn_private_chats")
        .update({
          last_message_at: now,
          last_message_preview: preview,
          updated_at: now
        })
        .eq("id", chatId);

      return {
        success: true,
        message: {
          id: msgData.id,
          chatId: msgData.chat_id,
          senderId: msgData.sender_id,
          messageText: msgData.message_text,
          createdAt: msgData.created_at
        }
      };
    } catch (err: any) {
      console.error("[PrivateChatRepository] Error in sendMessage:", err);
      return { success: false, error: err.message || "Failed to send message." };
    }
  }

  /**
   * Delete an individual message (Super Admin / Owner or Sender)
   */
  public static async deleteMessage(
    messageId: string,
    chatId: string,
    deletedBy: User
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured." };

    try {
      const userUuid = this.resolveUuid(deletedBy);

      // Permanently delete message row
      const { error: delErr } = await supabase
        .from("jn_private_chat_messages")
        .delete()
        .eq("id", messageId);

      if (delErr) throw delErr;

      // Update chat last message preview if needed
      const { data: remaining } = await supabase
        .from("jn_private_chat_messages")
        .select("message_text, created_at")
        .eq("chat_id", chatId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(1);

      const latestText = remaining && remaining.length > 0 ? remaining[0].message_text : "No messages";
      const preview = latestText.length > 60 ? latestText.substring(0, 57) + "..." : latestText;

      await supabase
        .from("jn_private_chats")
        .update({
          last_message_preview: preview,
          updated_at: new Date().toISOString()
        })
        .eq("id", chatId);

      // Audit Log with metadata only (NO message text)
      addAuditLog(
        deletedBy.email,
        deletedBy.name,
        deletedBy.role,
        "PRIVATE_CHAT_MESSAGE_DELETED",
        "SECURITY",
        `Private chat message '${messageId}' deleted by ${deletedBy.name}. Metadata logged; message text purged.`
      );

      return { success: true };
    } catch (err: any) {
      console.error("[PrivateChatRepository] Error in deleteMessage:", err);
      return { success: false, error: err.message || "Failed to delete message." };
    }
  }

  /**
   * Delete an entire conversation and all its messages (Super Admin / Owner only)
   */
  public static async deleteConversation(
    chatId: string,
    deletedBy: User
  ): Promise<{ success: boolean; error?: string }> {
    if (!isSupabaseConfigured()) return { success: false, error: "Supabase not configured." };

    if (deletedBy.role !== UserRole.OWNER && deletedBy.role !== "SUPERADMIN" && !deletedBy.email.toLowerCase().includes("jainnagarwal26")) {
      return { success: false, error: "Access Denied: Only Super Admin / Owner can delete entire conversations." };
    }

    try {
      // CASCADE deletion removes all messages automatically
      const { error } = await supabase
        .from("jn_private_chats")
        .delete()
        .eq("id", chatId);

      if (error) throw error;

      // Audit Log with metadata only
      addAuditLog(
        deletedBy.email,
        deletedBy.name,
        deletedBy.role,
        "PRIVATE_CHAT_CONVERSATION_DELETED",
        "SECURITY",
        `Private chat conversation '${chatId}' permanently deleted by ${deletedBy.name}.`
      );

      return { success: true };
    } catch (err: any) {
      console.error("[PrivateChatRepository] Error in deleteConversation:", err);
      return { success: false, error: err.message || "Failed to delete conversation." };
    }
  }

  /**
   * Mark all unread messages in a conversation as read by the recipient
   */
  public static async markConversationAsRead(chatId: string, currentUserId: string): Promise<void> {
    if (!isSupabaseConfigured() || !chatId || !currentUserId) return;

    try {
      const now = new Date().toISOString();
      await supabase
        .from("jn_private_chat_messages")
        .update({
          is_read: true,
          read_at: now
        })
        .eq("chat_id", chatId)
        .neq("sender_id", currentUserId)
        .eq("is_read", false);
    } catch (e) {
      console.error("[PrivateChatRepository] Error marking conversation as read:", e);
    }
  }

  /**
   * Get total unread private messages for the current user
   */
  public static async getUnreadMessageCount(currentUserId: string): Promise<number> {
    if (!isSupabaseConfigured() || !currentUserId) return 0;

    try {
      // 1. Get all active chat IDs where current user is a participant
      const { data: myChats, error: chatsErr } = await supabase
        .from("jn_private_chats")
        .select("id")
        .eq("is_active", true)
        .or(`participant_one_id.eq.${currentUserId},participant_two_id.eq.${currentUserId}`);

      if (chatsErr || !myChats || myChats.length === 0) return 0;

      const chatIds = myChats.map(c => c.id);

      // 2. Count unread messages not sent by current user
      const { count, error: countErr } = await supabase
        .from("jn_private_chat_messages")
        .select("*", { count: "exact", head: true })
        .in("chat_id", chatIds)
        .neq("sender_id", currentUserId)
        .eq("is_read", false)
        .is("deleted_at", null);

      if (countErr) return 0;
      return count || 0;
    } catch (e) {
      console.error("[PrivateChatRepository] Error getting unread count:", e);
      return 0;
    }
  }

  /**
   * Get participant IDs for a chat
   */
  public static async getChatParticipants(chatId: string): Promise<{ participantOneId: string; participantTwoId: string } | null> {
    if (!isSupabaseConfigured() || !chatId) return null;

    try {
      const { data, error } = await supabase
        .from("jn_private_chats")
        .select("participant_one_id, participant_two_id")
        .eq("id", chatId)
        .limit(1)
        .single();

      if (error || !data) return null;
      return {
        participantOneId: data.participant_one_id,
        participantTwoId: data.participant_two_id
      };
    } catch (e) {
      console.error("[PrivateChatRepository] Error getting chat participants:", e);
      return null;
    }
  }

  /**
   * Subscribe to live Realtime updates on private chat messages
   */
  public static subscribeToChat(
    chatId: string,
    onNewMessage: (msg: PrivateChatMessage) => void
  ) {
    if (!isSupabaseConfigured()) return () => {};

    const channelName = `chat_${chatId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jn_private_chat_messages",
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          if (payload.new) {
            onNewMessage({
              id: payload.new.id,
              chatId: payload.new.chat_id,
              senderId: payload.new.sender_id,
              messageText: payload.new.message_text,
              createdAt: payload.new.created_at,
              isRead: payload.new.is_read || false,
              readAt: payload.new.read_at || null,
              deletedAt: payload.new.deleted_at,
              deletedBy: payload.new.deleted_by,
              deletedReason: payload.new.deleted_reason
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}
