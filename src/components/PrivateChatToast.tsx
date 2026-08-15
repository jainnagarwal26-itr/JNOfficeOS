/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * JN OfficeOS - Module A: In-App Private Chat Floating Toast Notification
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { MessageSquare, X, ArrowRight, ShieldCheck } from "lucide-react";
import { 
  privateChatNotificationService, 
  PrivateChatToastData 
} from "../lib/privateChatNotificationService";

export const PrivateChatToast: React.FC = () => {
  const [toast, setToast] = useState<PrivateChatToastData | null>(null);

  useEffect(() => {
    const unsubscribe = privateChatNotificationService.subscribeToToast((newToast) => {
      setToast(newToast);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  if (!toast) return null;

  const preview = toast.messageText.length > 80 
    ? toast.messageText.substring(0, 77) + "..." 
    : toast.messageText;

  return (
    <div className="fixed top-5 right-5 z-50 pointer-events-none max-w-sm w-full px-4 sm:px-0">
      <AnimatePresence>
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: -25, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 25 }}
          className="pointer-events-auto bg-[#0D2C6C] text-white rounded-2xl shadow-2xl border border-white/15 p-4 backdrop-blur-xl relative overflow-hidden"
        >
          {/* Subtle gold accent glow */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#D4AF37]/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-start justify-between gap-3 relative z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                <MessageSquare className="w-4.5 h-4.5 text-[#D4AF37]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37]">
                    Private Message
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <h4 className="text-sm font-bold text-white tracking-tight">
                  {toast.senderName}
                </h4>
              </div>
            </div>

            <button
              onClick={() => privateChatNotificationService.dismissToast()}
              className="text-white/40 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-blue-100/90 font-sans mt-2.5 mb-3.5 line-clamp-2 leading-relaxed bg-white/5 p-2 rounded-xl border border-white/5">
            "{preview}"
          </p>

          <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10 text-xs">
            <div className="flex items-center gap-1 text-[10px] text-white/50">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              <span>End-to-End Private</span>
            </div>

            <div className="flex gap-1.5">
              <button
                onClick={() => privateChatNotificationService.dismissToast()}
                className="px-2.5 py-1 text-[11px] font-medium text-white/70 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                Dismiss
              </button>
              <button
                onClick={() => privateChatNotificationService.openChat(toast.chatId, toast.senderId)}
                className="px-3 py-1 bg-[#D4AF37] hover:bg-[#c49f2f] text-[#0D2C6C] text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-md transition-all cursor-pointer"
              >
                <span>Open Chat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
