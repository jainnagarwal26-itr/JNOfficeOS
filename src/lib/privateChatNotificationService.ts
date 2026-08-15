/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS Enterprise RDBMS - Module A: Private Chat Realtime Notification Service
 */

import { supabase, isSupabaseConfigured } from "./supabase";
import { User } from "../types";
import { PrivateChatRepository } from "./privateChatRepository";

export interface PrivateChatToastData {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  messageText: string;
  createdAt: string;
}

export type ToastListener = (toast: PrivateChatToastData | null) => void;
export type UnreadCountListener = (count: number) => void;
export type OpenChatHandler = (chatId: string, senderId: string) => void;

class PrivateChatNotificationService {
  private currentUserId: string | null = null;
  private currentUser: User | null = null;
  private activeChatId: string | null = null;
  private unreadCount: number = 0;
  private isMuted: boolean = false;
  private realtimeChannel: any = null;
  private toastListeners: Set<ToastListener> = new Set();
  private unreadListeners: Set<UnreadCountListener> = new Set();
  private openChatHandler: OpenChatHandler | null = null;
  private participantCache: Map<string, { participantOneId: string; participantTwoId: string }> = new Map();
  private userCache: Map<string, { fullName: string; role: string }> = new Map();
  private toastTimer: any = null;
  private currentToast: PrivateChatToastData | null = null;
  private isInitialized: boolean = false;

  constructor() {
    if (typeof window !== "undefined") {
      const savedMute = localStorage.getItem("jn_officeos_chat_sound_muted");
      this.isMuted = savedMute === "true";
    }
  }

  /**
   * Initialize central realtime subscription for authenticated user
   */
  public async initialize(user: User, onOpenChat?: OpenChatHandler): Promise<void> {
    if (!user) return;
    const resolvedId = PrivateChatRepository.resolveUuid(user);

    // If already initialized for this user, avoid duplicate channel subscriptions
    if (this.isInitialized && this.currentUserId === resolvedId && this.realtimeChannel) {
      if (onOpenChat) this.openChatHandler = onOpenChat;
      await this.refreshUnreadCount();
      return;
    }

    // Clean up any previous user's subscription
    this.destroy();

    this.currentUser = user;
    this.currentUserId = resolvedId;
    if (onOpenChat) this.openChatHandler = onOpenChat;
    this.isInitialized = true;

    // Load initial unread count
    await this.refreshUnreadCount();

    // Cache all users for immediate name resolution on incoming message
    await this.warmupUserCache();

    // Subscribe to central Realtime channel
    this.setupRealtimeSubscription();
  }

  /**
   * Cleanly unsubscribe and reset state on logout
   */
  public destroy(): void {
    if (this.realtimeChannel && isSupabaseConfigured()) {
      try {
        supabase.removeChannel(this.realtimeChannel);
      } catch (e) {
        console.warn("[PrivateChatNotificationService] Error removing channel:", e);
      }
      this.realtimeChannel = null;
    }

    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }

    this.currentUserId = null;
    this.currentUser = null;
    this.activeChatId = null;
    this.unreadCount = 0;
    this.currentToast = null;
    this.isInitialized = false;
    this.notifyUnreadListeners(0);
    this.notifyToastListeners(null);
  }

  /**
   * Register handler for opening specific chat on toast / OS notification click
   */
  public setOpenChatHandler(handler: OpenChatHandler): void {
    this.openChatHandler = handler;
  }

  /**
   * Set currently open chat ID (for active suppression)
   */
  public setActiveChatId(chatId: string | null): void {
    this.activeChatId = chatId;
    if (chatId && this.currentUserId) {
      // Auto mark as read in background
      PrivateChatRepository.markConversationAsRead(chatId, this.currentUserId).then(() => {
        this.refreshUnreadCount();
      });
      // Dismiss current toast if it belongs to this chat
      if (this.currentToast && this.currentToast.chatId === chatId) {
        this.dismissToast();
      }
    }
  }

  /**
   * Get active chat ID
   */
  public getActiveChatId(): string | null {
    return this.activeChatId;
  }

  /**
   * Subscribe to in-app toast updates
   */
  public subscribeToToast(listener: ToastListener): () => void {
    this.toastListeners.add(listener);
    listener(this.currentToast);
    return () => {
      this.toastListeners.delete(listener);
    };
  }

  /**
   * Subscribe to unread counter updates
   */
  public subscribeToUnreadCount(listener: UnreadCountListener): () => void {
    this.unreadListeners.add(listener);
    listener(this.unreadCount);
    return () => {
      this.unreadListeners.delete(listener);
    };
  }

  /**
   * Refresh unread count from Supabase
   */
  public async refreshUnreadCount(): Promise<number> {
    if (!this.currentUserId) return 0;
    try {
      const count = await PrivateChatRepository.getUnreadMessageCount(this.currentUserId);
      this.unreadCount = count;
      this.notifyUnreadListeners(count);
      return count;
    } catch (e) {
      console.error("[PrivateChatNotificationService] Error refreshing unread count:", e);
      return this.unreadCount;
    }
  }

  /**
   * Dismiss active toast
   */
  public dismissToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.currentToast = null;
    this.notifyToastListeners(null);
  }

  /**
   * Trigger open chat from toast
   */
  public openChat(chatId: string, senderId: string): void {
    this.dismissToast();
    if (this.openChatHandler) {
      this.openChatHandler(chatId, senderId);
    }
  }

  /**
   * Sound preferences
   */
  public isSoundMuted(): boolean {
    return this.isMuted;
  }

  public setSoundMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof window !== "undefined") {
      localStorage.setItem("jn_officeos_chat_sound_muted", muted ? "true" : "false");
    }
  }

  /**
   * Request standard Web Notification permission
   */
  public async requestBrowserPermission(): Promise<NotificationPermission> {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.error("[PrivateChatNotificationService] Error requesting notification permission:", e);
      return "denied";
    }
  }

  public getBrowserPermission(): NotificationPermission {
    if (typeof window === "undefined" || !("Notification" in window)) {
      return "denied";
    }
    return Notification.permission;
  }

  /**
   * Setup single central Realtime subscription on jn_private_chat_messages
   */
  private setupRealtimeSubscription(): void {
    if (!isSupabaseConfigured() || !this.currentUserId) return;

    const channelName = `central_private_chat_notifications_${this.currentUserId}`;
    
    this.realtimeChannel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jn_private_chat_messages"
        },
        async (payload) => {
          if (payload.new) {
            await this.handleIncomingMessage(payload.new);
          }
        }
      )
      .subscribe();
  }

  /**
   * Process incoming realtime message with strict isolation guards
   */
  private async handleIncomingMessage(rawMsg: any): Promise<void> {
    if (!this.currentUserId || !rawMsg) return;

    const senderId = rawMsg.sender_id;
    const chatId = rawMsg.chat_id;
    const messageText = rawMsg.message_text || "";

    // 1. HARD GUARD: Ignore messages sent by self
    if (senderId === this.currentUserId) {
      return;
    }

    // 2. Resolve chat participants
    const participants = await this.resolveChatParticipants(chatId);
    if (!participants) return;

    // 3. HARD PRIVACY GUARD: Verify current user is one of the two participants
    const isParticipant =
      participants.participantOneId === this.currentUserId ||
      participants.participantTwoId === this.currentUserId;

    if (!isParticipant) {
      // Current user is neither participant_one nor participant_two: DISCARD COMPLETELY
      return;
    }

    // 4. ACTIVE CHAT SUPPRESSION: If user is actively viewing this exact conversation
    if (this.activeChatId === chatId) {
      // Auto mark as read in database
      await PrivateChatRepository.markConversationAsRead(chatId, this.currentUserId);
      return;
    }

    // 5. Update unread counter
    await this.refreshUnreadCount();

    // 6. Resolve sender display name
    const senderName = await this.resolveSenderName(senderId);

    // 7. Play subtle audio chime if not muted
    this.playChime();

    // 8. In-App Floating Toast
    const toastData: PrivateChatToastData = {
      id: rawMsg.id || `toast_${Date.now()}`,
      chatId,
      senderId,
      senderName,
      messageText,
      createdAt: rawMsg.created_at || new Date().toISOString()
    };

    this.currentToast = toastData;
    this.notifyToastListeners(toastData);

    // Auto dismiss toast after 6 seconds
    if (this.toastTimer) clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      if (this.currentToast?.id === toastData.id) {
        this.dismissToast();
      }
    }, 6000);

    // 9. Standard Web Browser / Desktop Notification
    this.triggerBrowserNotification(chatId, senderId, senderName, messageText);
  }

  /**
   * Standard Web Browser Notification when tab is hidden / out of focus
   */
  private triggerBrowserNotification(chatId: string, senderId: string, senderName: string, messageText: string): void {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    // Only fire OS notification if tab is hidden or not focused
    const isTabHidden = typeof document !== "undefined" && (document.hidden || !document.hasFocus());
    if (!isTabHidden) return;

    try {
      const preview = messageText.length > 70 ? messageText.substring(0, 67) + "..." : messageText;
      const notification = new Notification(`JN OfficeOS — ${senderName}`, {
        body: preview,
        tag: `jn_chat_${chatId}`,
        renotify: true,
        silent: false
      });

      notification.onclick = () => {
        try {
          if (typeof window !== "undefined") {
            window.focus();
          }
        } catch (e) {}
        this.openChat(chatId, senderId);
        notification.close();
      };
    } catch (e) {
      console.warn("[PrivateChatNotificationService] Error creating browser notification:", e);
    }
  }

  /**
   * Professional Web Audio API Synthesized Chime (No external audio file needed)
   */
  private playChime(): void {
    if (this.isMuted || typeof window === "undefined") return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      
      // Dual-tone harmonic chime (D5 -> A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880.00, now + 0.12); // A5

      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1174.66, now); // D6 harmonic overtone
      osc2.frequency.exponentialRampToValueAtTime(1760.00, now + 0.12);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.36);
      osc2.stop(now + 0.36);

      setTimeout(() => {
        ctx.close().catch(() => {});
      }, 500);
    } catch (e) {
      // Gracefully ignore audio errors if blocked by browser policy
    }
  }

  /**
   * Helper: Resolve chat participants with cache
   */
  private async resolveChatParticipants(chatId: string): Promise<{ participantOneId: string; participantTwoId: string } | null> {
    if (this.participantCache.has(chatId)) {
      return this.participantCache.get(chatId)!;
    }

    const participants = await PrivateChatRepository.getChatParticipants(chatId);
    if (participants) {
      this.participantCache.set(chatId, participants);
    }
    return participants;
  }

  /**
   * Helper: Warm up user directory cache
   */
  private async warmupUserCache(): Promise<void> {
    if (!isSupabaseConfigured()) return;
    try {
      const { data } = await supabase.from("jn_users").select("id, full_name, role");
      if (data) {
        data.forEach(u => {
          this.userCache.set(u.id, { fullName: u.full_name, role: u.role });
        });
      }
    } catch (e) {
      console.warn("[PrivateChatNotificationService] Error warming up user cache:", e);
    }
  }

  /**
   * Helper: Resolve sender display name
   */
  private async resolveSenderName(senderId: string): Promise<string> {
    if (this.userCache.has(senderId)) {
      return this.userCache.get(senderId)!.fullName;
    }
    try {
      const { data } = await supabase.from("jn_users").select("full_name").eq("id", senderId).single();
      if (data?.full_name) {
        this.userCache.set(senderId, { fullName: data.full_name, role: "STAFF" });
        return data.full_name;
      }
    } catch (e) {}
    return "Staff Member";
  }

  private notifyToastListeners(toast: PrivateChatToastData | null): void {
    this.toastListeners.forEach(listener => {
      try {
        listener(toast);
      } catch (e) {
        console.error(e);
      }
    });
  }

  private notifyUnreadListeners(count: number): void {
    this.unreadListeners.forEach(listener => {
      try {
        listener(count);
      } catch (e) {
        console.error(e);
      }
    });
  }
}

export const privateChatNotificationService = new PrivateChatNotificationService();
