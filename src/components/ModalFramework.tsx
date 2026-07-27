/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

// ============================================================================
// CENTRALIZED ENTERPRISE Z-INDEX SYSTEM
// ============================================================================
export const Z_INDEX = {
  HEADER: "z-[30]",
  SIDEBAR: "z-[40]",
  DROPDOWN: "z-[50]",
  POPOVER: "z-[60]",
  TOOLTIP: "z-[80]",
  MODAL_OVERLAY: "z-[100]",
  MODAL_WINDOW: "z-[101]",
  TOAST: "z-[120]",
};

// ============================================================================
// CONTEXT & PROVIDER TYPE DEFINITIONS
// ============================================================================
interface ModalContextType {
  openModals: string[];
  openModal: (id: string) => void;
  closeModal: (id: string) => void;
  isModalOpen: (id: string) => boolean;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [openModals, setOpenModals] = useState<string[]>([]);

  const openModal = (id: string) => {
    setOpenModals((prev) => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const closeModal = (id: string) => {
    setOpenModals((prev) => prev.filter((m) => m !== id));
  };

  const isModalOpen = (id: string) => openModals.includes(id);

  // Lock scroll of active background body viewport
  useEffect(() => {
    if (openModals.length > 0) {
      document.body.classList.add("modal-open-lock");
      document.body.style.overflow = "hidden";
    } else {
      document.body.classList.remove("modal-open-lock");
      document.body.style.overflow = "";
    }
    return () => {
      document.body.classList.remove("modal-open-lock");
      document.body.style.overflow = "";
    };
  }, [openModals]);

  // Standard keyboard handling of topmost active window via Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openModals.length > 0) {
        const topmostId = openModals[openModals.length - 1];
        const event = new CustomEvent(`close-modal-${topmostId}`);
        window.dispatchEvent(event);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [openModals]);

  return (
    <ModalContext.Provider value={{ openModals, openModal, closeModal, isModalOpen }}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

// ============================================================================
// REUSABLE COMPOUND COMPONENT WRAPPERS
// ============================================================================

interface ModalProps {
  id: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidthClassName?: string; // Standard customizable wrapper e.g. "max-w-4xl"
}

export const Modal: React.FC<ModalProps> = ({
  id,
  isOpen,
  onClose,
  children,
  maxWidthClassName = "max-w-4xl",
}) => {
  const { openModal, closeModal, openModals } = useModal();
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Track state in global ModalProvider active ledger stack
  useEffect(() => {
    if (isOpen) {
      openModal(id);
      previousFocusRef.current = document.activeElement as HTMLElement;
    } else {
      closeModal(id);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    }
  }, [isOpen, id]);

  // Direct cleanup on component unmount lifecycle
  useEffect(() => {
    return () => {
      closeModal(id);
    };
  }, [id]);

  // Listener pattern triggers closure of declarative modals
  useEffect(() => {
    const handleCloseEvent = () => {
      onClose();
    };
    window.addEventListener(`close-modal-${id}`, handleCloseEvent);
    return () => window.removeEventListener(`close-modal-${id}`, handleCloseEvent);
  }, [id, onClose]);

  // Focus Trapping algorithm for accessibility compliance
  useEffect(() => {
    if (!isOpen) return;

    const handleFocusTrap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      if (!containerRef.current) return;

      const focusableSelectors = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const focusables = containerRef.current.querySelectorAll(focusableSelectors);
      const focusableElements = (Array.from(focusables) as HTMLElement[]).filter(
        (el) => !el.hasAttribute("disabled") && el.getAttribute("aria-hidden") !== "true"
      );

      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleFocusTrap);
    return () => window.removeEventListener("keydown", handleFocusTrap);
  }, [isOpen]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className={`fixed inset-0 flex items-center justify-center p-4 z-[100]`}>
          {/* Overlay Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal content body frame */}
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`w-full ${maxWidthClassName} bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col relative z-[101] max-h-[90vh] overflow-hidden`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`modal-title-${id}`}
          >
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

// ============================================================================
// MODAL STRUCTURAL CHILD PARTS
// ============================================================================

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
  id?: string;
}

export const ModalHeader: React.FC<ModalHeaderProps> = ({ children, onClose, id }) => {
  return (
    <div className="flex justify-between items-start border-b border-slate-100 px-6 py-4 shrink-0">
      <div id={id ? `modal-title-${id}` : undefined} className="flex-grow">
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          className="text-slate-400 hover:text-slate-600 text-sm cursor-pointer p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
          aria-label="Close dialog"
        >
          ✕
        </button>
      )}
    </div>
  );
};

interface ModalBodyProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalBody: React.FC<ModalBodyProps> = ({ children, className = "" }) => {
  return (
    <div className={`p-6 overflow-y-auto flex-grow ${className}`}>
      {children}
    </div>
  );
};

interface ModalFooterProps {
  children: React.ReactNode;
  className?: string;
}

export const ModalFooter: React.FC<ModalFooterProps> = ({ children, className = "" }) => {
  return (
    <div className={`px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0 ${className}`}>
      {children}
    </div>
  );
};
