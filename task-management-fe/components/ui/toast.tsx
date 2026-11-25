"use client";

import { useEffect } from "react";

type ToastProps = { message: string; onDismiss: () => void; duration?: number };

/** A single toast that dismisses itself after `duration` ms. */
export function Toast({ message, onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-6 right-6 z-50 flex items-center gap-4 rounded-xl bg-foreground px-4 py-3 text-sm font-medium text-background shadow-lg"
    >
      <span>{message}</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss} className="opacity-70 hover:opacity-100">
        ✕
      </button>
    </div>
  );
}
