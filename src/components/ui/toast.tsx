"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

type ToastProps = {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
  duration?: number;
};

export function Toast({ message, onUndo, onDismiss, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onDismiss, 300); // Wait for fade-out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!isVisible) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-lg border border-[#e5e7eb] bg-white px-4 py-3 shadow-lg transition-all duration-300"
      role="alert"
      aria-live="polite"
      style={{
        animation: "slideInUp 0.3s ease-out",
      }}
    >
      <span className="text-sm text-[#111827]">{message}</span>
      {onUndo && (
        <button
          onClick={() => {
            onUndo();
            setIsVisible(false);
            setTimeout(onDismiss, 300);
          }}
          className="text-sm font-medium text-[#7c3aed] hover:text-[#6d28d9] transition-colors"
        >
          Undo
        </button>
      )}
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onDismiss, 300);
        }}
        className="text-[#9ca3af] hover:text-[#6b7280] transition-colors"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

type ToastState = {
  message: string;
  onUndo?: () => void;
} | null;

export function useToast() {
  const [toast, setToast] = useState<ToastState>(null);

  const showToast = (message: string, onUndo?: () => void) => {
    setToast({ message, onUndo });
  };

  const dismissToast = () => {
    setToast(null);
  };

  return { toast, showToast, dismissToast };
}
