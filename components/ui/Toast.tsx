"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type ToastTone = "success" | "error" | "info";

type ToastItem = {
  id: number;
  tone: ToastTone;
  message: string;
  action?: { label: string; href: string };
};

type ToastApi = {
  show: (message: string, tone?: ToastTone, action?: ToastItem["action"]) => void;
  success: (message: string, action?: ToastItem["action"]) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const TONES: Record<ToastTone, string> = {
  success: "border-success/40 bg-success-bg text-success",
  error: "border-danger/40 bg-danger-bg text-danger",
  info: "border-border bg-surface text-fg",
};

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback<ToastApi["show"]>(
    (message, tone = "info", action) => {
      const id = nextId++;
      setToasts((current) => [...current.slice(-3), { id, tone, message, action }]);
      // Errors stay longer so they can be read.
      window.setTimeout(() => dismiss(id), tone === "error" ? 8000 : 5000);
    },
    [dismiss]
  );

  const api = useMemo<ToastApi>(
    () => ({
      show,
      success: (message, action) => show(message, "success", action),
      error: (message) => show(message, "error"),
    }),
    [show]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4 sm:items-end"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role={toast.tone === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-md border px-4 py-3 text-sm font-medium shadow-lg",
              TONES[toast.tone]
            )}
          >
            <span className="flex-1">{toast.message}</span>
            {toast.action ? (
              <a href={toast.action.href} className="font-bold underline underline-offset-2">
                {toast.action.label}
              </a>
            ) : null}
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss notification"
              className="opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside <ToastProvider>.");
  }
  return context;
}
