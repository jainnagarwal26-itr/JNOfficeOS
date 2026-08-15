/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS - Module A: Private Staff Chat Component
 * Super Admin ↔ Individual Staff Only
 */

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  MessageSquare, Lock, Send, Trash2, Search, User as UserIcon, 
  ShieldCheck, RefreshCw, AlertCircle, Clock, CheckCircle2, MoreVertical,
  Volume2, VolumeX, Bell, BellOff, Check, CheckCheck
} from "lucide-react";
import { User, UserRole } from "../types";
import { 
  PrivateChatRepository, 
  PrivateChat, 
  PrivateChatMessage, 
  StaffChatDirectoryUser 
} from "../lib/privateChatRepository";
import { privateChatNotificationService } from "../lib/privateChatNotificationService";

interface PrivateStaffChatProps {
  currentUser: User;
  targetChatId?: string | null;
  targetUserId?: string | null;
  onAddAuditLog: (
    action: string,
    category: "AUTH" | "SECURITY" | "DATABASE" | "SETTINGS" | "SYSTEM",
    details: string
  ) => void;
}

export function PrivateStaffChat({ 
  currentUser, 
  targetChatId, 
  targetUserId, 
  onAddAuditLog 
}: PrivateStaffChatProps) {
  const isOwner = currentUser.role === UserRole.OWNER || currentUser.role === "SUPERADMIN" || currentUser.email?.toLowerCase().includes("jainnagarwal26");
  const currentUuid = PrivateChatRepository.resolveUuid(currentUser);

  // States
  const [staffList, setStaffList] = useState<StaffChatDirectoryUser[]>([]);
  const [activeChats, setActiveChats] = useState<PrivateChat[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<StaffChatDirectoryUser | null>(null);
  const [currentChat, setCurrentChat] = useState<PrivateChat | null>(null);
  const [messages, setMessages] = useState<PrivateChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Loading & Action states
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sound & Notification state
  const [isMuted, setIsMuted] = useState<boolean>(() => privateChatNotificationService.isSoundMuted());
  const [browserPermission, setBrowserPermission] = useState<NotificationPermission>(() => privateChatNotificationService.getBrowserPermission());

  // Report active chat ID to central notification service for active suppression
  useEffect(() => {
    if (currentChat) {
      privateChatNotificationService.setActiveChatId(currentChat.id);
      PrivateChatRepository.markConversationAsRead(currentChat.id, currentUuid);
    } else {
      privateChatNotificationService.setActiveChatId(null);
    }

    return () => {
      privateChatNotificationService.setActiveChatId(null);
    };
  }, [currentChat, currentUuid]);

  // Load Staff Directory & Recent Chats on mount
  useEffect(() => {
    loadDirectoryAndChats();
  }, [currentUser, targetChatId, targetUserId]);

  const loadDirectoryAndChats = async () => {
    setIsLoadingDirectory(true);
    setError(null);
    try {
      const directory = await PrivateChatRepository.getStaffDirectory(currentUser);
      setStaffList(directory);

      const chats = await PrivateChatRepository.getMyPrivateChats(currentUser);
      setActiveChats(chats);

      // 1. If targetUserId is given, find and select
      if (targetUserId) {
        const targetStaff = directory.find(s => s.id === targetUserId);
        if (targetStaff) {
          handleSelectStaff(targetStaff);
          return;
        }
      }

      // 2. If targetChatId is given, find chat and select participant
      if (targetChatId) {
        const targetChat = chats.find(c => c.id === targetChatId);
        if (targetChat) {
          const otherId = targetChat.participantOneId === currentUuid ? targetChat.participantTwoId : targetChat.participantOneId;
          const targetStaff = directory.find(s => s.id === otherId);
          if (targetStaff) {
            handleSelectStaff(targetStaff);
            return;
          }
        }
      }

      // 3. Fallback auto-select first staff member if available
      if (directory.length > 0 && !selectedStaff) {
        handleSelectStaff(directory[0]);
      }
    } catch (err: any) {
      console.error("Failed to load staff chat directory:", err);
      setError("Unable to load chat directory. Please try again.");
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // When staff member is selected
  const handleSelectStaff = async (staff: StaffChatDirectoryUser) => {
    setSelectedStaff(staff);
    setIsLoadingMessages(true);
    setError(null);

    try {
      // Get or create 1-to-1 conversation
      const chatRes = await PrivateChatRepository.getOrCreatePrivateChat(currentUuid, staff.id);
      if (chatRes.success && chatRes.chat) {
        setCurrentChat(chatRes.chat);
        privateChatNotificationService.setActiveChatId(chatRes.chat.id);
        const msgs = await PrivateChatRepository.getChatMessages(chatRes.chat.id);
        setMessages(msgs);
        // Mark messages as read
        await PrivateChatRepository.markConversationAsRead(chatRes.chat.id, currentUuid);
        await privateChatNotificationService.refreshUnreadCount();
      } else {
        setError(chatRes.error || "Failed to initialize conversation.");
      }
    } catch (err: any) {
      console.error("Error opening chat:", err);
      setError("Error opening conversation.");
    } finally {
      setIsLoadingMessages(false);
    }
  };

  // Realtime subscription for incoming messages in active conversation
  useEffect(() => {
    if (!currentChat) return;

    const unsubscribe = PrivateChatRepository.subscribeToChat(currentChat.id, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });

      // If message is from other user, automatically mark as read since chat is open
      if (newMsg.senderId !== currentUuid) {
        PrivateChatRepository.markConversationAsRead(currentChat.id, currentUuid);
        privateChatNotificationService.refreshUnreadCount();
      }
    });

    return () => {
      if (typeof unsubscribe === "function") {
        unsubscribe();
      }
    };
  }, [currentChat, currentUuid]);

  const toggleSound = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    privateChatNotificationService.setSoundMuted(nextMuted);
  };

  const handleEnableNotifications = async () => {
    const res = await privateChatNotificationService.requestBrowserPermission();
    setBrowserPermission(res);
  };

  // Handle Send Message
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentChat || isSending) return;

    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const sendRes = await PrivateChatRepository.sendMessage(currentChat.id, currentUser, textToSend);
      if (sendRes.success && sendRes.message) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === sendRes.message!.id)) return prev;
          return [...prev, sendRes.message!];
        });

        // Update activeChats preview
        setActiveChats((prev) =>
          prev.map((c) =>
            c.id === currentChat.id
              ? { ...c, lastMessageAt: new Date().toISOString(), lastMessagePreview: textToSend }
              : c
          )
        );
      } else {
        setError(sendRes.error || "Failed to send message.");
        setInputText(textToSend); // Restore text on failure
      }
    } catch (err: any) {
      console.error("Error sending message:", err);
      setError("Failed to deliver message.");
      setInputText(textToSend);
    } finally {
      setIsSending(false);
      textareaRef.current?.focus();
    }
  };

  // Handle Key Down: Enter to Send, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Delete Individual Message (Super Admin / Owner only)
  const handleDeleteMessage = async (msgId: string) => {
    if (!isOwner) return;
    if (!confirm("Are you sure you want to permanently delete this private message?")) return;

    try {
      if (!currentChat) return;
      const res = await PrivateChatRepository.deleteMessage(msgId, currentChat.id, currentUser);
      if (res.success) {
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
        onAddAuditLog(
          "PRIVATE_CHAT_MESSAGE_DELETED",
          "SECURITY",
          `Super Admin deleted message '${msgId}' from private chat '${currentChat.id}'.`
        );
      } else {
        alert(res.error || "Failed to delete message.");
      }
    } catch (err: any) {
      alert("Error deleting message.");
    }
  };

  // Delete Entire Conversation (Super Admin / Owner only)
  const handleDeleteConversation = async () => {
    if (!isOwner || !currentChat || !selectedStaff) return;
    if (!confirm(`Are you sure you want to permanently delete the entire private chat with ${selectedStaff.fullName}? All message history will be removed.`)) return;

    try {
      const res = await PrivateChatRepository.deleteConversation(currentChat.id, currentUser);
      if (res.success) {
        setMessages([]);
        setCurrentChat(null);
        setSelectedStaff(null);
        await loadDirectoryAndChats();
        onAddAuditLog(
          "PRIVATE_CHAT_CONVERSATION_DELETED",
          "SECURITY",
          `Super Admin deleted entire private conversation with ${selectedStaff.fullName}.`
        );
      } else {
        alert(res.error || "Failed to delete conversation.");
      }
    } catch (err: any) {
      alert("Error deleting conversation.");
    }
  };

  // Filter staff list by search query
  const filteredStaff = staffList.filter((s) =>
    s.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.userNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.designation?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-[#0D2C6C]/5 border border-[#0D2C6C]/10 rounded-2xl flex items-center justify-center text-[#0D2C6C] shadow-inner">
            <Lock className="w-6 h-6 text-[#D4AF37]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-extrabold text-[#0D2C6C] text-lg tracking-tight">
                {isOwner ? "Private Staff Chat" : "Private Chat with Management"}
              </h2>
              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md">
                <ShieldCheck className="w-3 h-3" />
                1-to-1 Encrypted Isolation
              </span>
            </div>
            <p className="text-xs text-slate-500 font-sans mt-0.5">
              {isOwner 
                ? "Confidential one-to-one communication stream with authorized individual staff members." 
                : "Confidential direct communication channel with Super Admin / Managing CA Chirag Jain."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle Control */}
          <button
            onClick={toggleSound}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-sm transition-all cursor-pointer ${
              isMuted 
                ? "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200" 
                : "bg-amber-50 border-amber-200/80 text-amber-800 hover:bg-amber-100"
            }`}
            title={isMuted ? "Unmute notification chime" : "Mute notification chime"}
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
            <span>{isMuted ? "Muted" : "Chime On"}</span>
          </button>

          {/* Browser Notification Opt-In */}
          {browserPermission !== "granted" && browserPermission !== "denied" && (
            <button
              onClick={handleEnableNotifications}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0D2C6C] hover:bg-[#092254] text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
              title="Enable Windows / Browser desktop notifications"
            >
              <Bell className="w-3.5 h-3.5 text-[#D4AF37]" />
              <span>Enable Desktop Alerts</span>
            </button>
          )}

          <button
            onClick={loadDirectoryAndChats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            title="Refresh conversations"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDirectory ? "animate-spin text-[#D4AF37]" : ""}`} />
            <span>Sync Messages</span>
          </button>
        </div>
      </div>

      {/* Main Chat Layout Canvas */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[580px] max-h-[700px]">
        
        {/* LEFT COLUMN: STAFF DIRECTORY LIST */}
        <div className="md:col-span-4 border-r border-slate-100 flex flex-col bg-slate-50/50">
          
          {/* Search Header */}
          <div className="p-4 border-b border-slate-100 bg-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold text-[#0D2C6C] uppercase tracking-wider">
                {isOwner ? "Active Staff Directory" : "Direct Channel"}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {filteredStaff.length} {isOwner ? "Staff" : "Contact"}
              </span>
            </div>

            {isOwner && (
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search staff by name or STF ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D2C6C]"
                />
              </div>
            )}
          </div>

          {/* Staff List Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingDirectory ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>Loading staff directory...</span>
              </div>
            ) : filteredStaff.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No staff members found.
              </div>
            ) : (
              filteredStaff.map((staff) => {
                const isSelected = selectedStaff?.id === staff.id;
                const matchedChat = activeChats.find(
                  (c) => c.participantOneId === staff.id || c.participantTwoId === staff.id
                );

                return (
                  <button
                    key={staff.id}
                    onClick={() => handleSelectStaff(staff)}
                    className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 cursor-pointer ${
                      isSelected
                        ? "bg-[#0D2C6C] text-white shadow-md shadow-blue-950/20"
                        : "hover:bg-white text-slate-700 hover:shadow-sm"
                    }`}
                  >
                    {/* Avatar Circle */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isSelected 
                        ? "bg-white/10 text-[#D4AF37] border border-white/20" 
                        : "bg-[#0D2C6C]/10 text-[#0D2C6C]"
                    }`}>
                      {staff.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                    </div>

                    {/* Staff Metadata */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className={`font-bold text-xs truncate ${isSelected ? "text-white" : "text-slate-800"}`}>
                          {staff.fullName}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold shrink-0 ${
                          isSelected ? "bg-white/15 text-white/90" : "bg-slate-200/60 text-slate-600"
                        }`}>
                          {staff.userNumber}
                        </span>
                      </div>
                      <p className={`text-[10px] truncate mt-0.5 ${isSelected ? "text-white/70" : "text-slate-400"}`}>
                        {matchedChat?.lastMessagePreview || staff.designation || "Private Channel"}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Security Note */}
          <div className="p-3 border-t border-slate-100 bg-white/70 text-[9px] text-slate-400 flex items-center gap-1.5 justify-center font-medium">
            <Lock className="w-3 h-3 text-[#D4AF37]" />
            <span>RLS Protected • Zero Cross-Staff Visibility</span>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE CHAT CONVERSATION CANVAS */}
        <div className="md:col-span-8 flex flex-col h-full bg-white">
          
          {selectedStaff ? (
            <>
              {/* Chat Canvas Header */}
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-[#0D2C6C] text-[#D4AF37] font-bold rounded-xl flex items-center justify-center text-xs shrink-0 shadow-sm">
                    {selectedStaff.fullName.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-extrabold text-[#0D2C6C] text-sm">
                        {selectedStaff.fullName}
                      </h3>
                      <span className="text-[9px] font-mono font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1.5 py-0.2 rounded">
                        {selectedStaff.userNumber}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.2 rounded">
                        <Lock className="w-2.5 h-2.5" />
                        Private
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">
                      {selectedStaff.designation} • {selectedStaff.email}
                    </p>
                  </div>
                </div>

                {/* Owner Delete Conversation Control */}
                {isOwner && (
                  <button
                    onClick={handleDeleteConversation}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Delete full conversation and all its messages"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear Chat</span>
                  </button>
                )}
              </div>

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
                {isLoadingMessages ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400 gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
                    <span>Loading conversation history...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
                    <div className="w-12 h-12 bg-blue-50 text-[#0D2C6C] rounded-2xl flex items-center justify-center border border-blue-100">
                      <MessageSquare className="w-6 h-6 text-[#D4AF37]" />
                    </div>
                    <div className="space-y-1">
                      <p className="font-bold text-xs text-slate-700">No Messages in this Channel</p>
                      <p className="text-[11px] text-slate-400 max-w-sm">
                        Start communicating securely. Messages are isolated and visible only to {currentUser.name} and {selectedStaff.fullName}.
                      </p>
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isSelf = msg.senderId === currentUuid;

                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col group ${isSelf ? "items-end" : "items-start"}`}
                      >
                        <div className="flex items-end gap-1.5 max-w-[80%]">
                          {/* Owner Delete Icon on hover */}
                          {isOwner && (
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}

                          {/* Message Bubble */}
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed break-words shadow-sm ${
                              isSelf
                                ? "bg-[#0D2C6C] text-white rounded-br-none"
                                : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{msg.messageText}</p>
                            <div className={`text-[9px] mt-1 text-right flex items-center justify-end gap-1 ${
                              isSelf ? "text-white/60" : "text-slate-400"
                            }`}>
                              <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              {isSelf && (
                                msg.isRead ? (
                                  <span title={`Read: ${msg.readAt ? new Date(msg.readAt).toLocaleTimeString() : "Delivered"}`} className="flex items-center text-cyan-300">
                                    <CheckCheck className="w-3.5 h-3.5 text-cyan-300" />
                                  </span>
                                ) : (
                                  <span title="Delivered to cloud" className="flex items-center text-[#D4AF37]">
                                    <Check className="w-3 h-3 text-[#D4AF37]" />
                                  </span>
                                )
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Error Message Toast in Chat */}
              {error && (
                <div className="px-4 py-2 bg-rose-50 border-t border-rose-100 text-xs text-rose-700 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700 font-bold">×</button>
                </div>
              )}

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-end gap-2 shrink-0">
                <textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Message ${selectedStaff.fullName}... (Enter to send, Shift+Enter for new line)`}
                  rows={2}
                  className="flex-1 px-3.5 py-2 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#0D2C6C] focus:ring-1 focus:ring-[#0D2C6C] resize-none font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className={`px-4 py-2.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 cursor-pointer ${
                    !inputText.trim() || isSending
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-[#D4AF37] hover:bg-[#c29e2f] text-[#0D2C6C] shadow-amber-900/10 active:scale-95"
                  }`}
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400">
              <MessageSquare className="w-10 h-10 text-slate-300" />
              <p className="text-xs font-bold">Select a staff member from the left to start a private chat.</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
