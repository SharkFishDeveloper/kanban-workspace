"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { AlertTriangle, Check, Undo, X } from "@/components/icons";

const ToastContext = createContext(null);
let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback(
    (options) => {
      const opts = typeof options === "string" ? { message: options } : options;
      const id = ++counter;
      const item = {
        id,
        variant: "default",
        duration: 4500,
        ...opts,
      };
      setToasts((list) => [...list.slice(-3), item]);
      if (item.duration > 0) {
        const timer = setTimeout(() => dismiss(id), item.duration);
        timers.current.set(id, timer);
      }
      return id;
    },
    [dismiss]
  );

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="animate-toast-in pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-ink shadow-float"
            role="status"
          >
            <span
              className={`grid size-7 flex-none place-items-center rounded-full ${
                t.variant === "error"
                  ? "bg-hi-soft text-hi"
                  : "bg-lo-soft text-lo"
              }`}
            >
              {t.variant === "error" ? (
                <AlertTriangle size={15} />
              ) : (
                <Check size={15} strokeWidth={2.6} />
              )}
            </span>
            <p className="min-w-0 flex-1 text-sm font-medium">{t.message}</p>
            {t.actionLabel && (
              <button
                type="button"
                className="inline-flex flex-none items-center gap-1 rounded-md px-2 py-1 text-[13px] font-bold text-accent hover:bg-accent-soft"
                onClick={() => {
                  t.onAction?.();
                  dismiss(t.id);
                }}
              >
                <Undo size={14} />
                {t.actionLabel}
              </button>
            )}
            <button
              type="button"
              className="grid size-6 flex-none place-items-center rounded-md text-muted hover:bg-bg-2 hover:text-ink"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
