"use client";

import { useEffect, useRef } from "react";
import { btn, btnDanger } from "@/components/ui";
import { AlertTriangle } from "@/components/icons";

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const cancelRef = useRef(null);

  useEffect(() => {
    cancelRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onCancel]);

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-[rgba(8,12,20,0.55)] p-4 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        className="animate-pop-in w-full max-w-[420px] rounded-2xl border border-line bg-card p-5 text-ink shadow-float"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-message"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3.5">
          <span className="grid size-10 flex-none place-items-center rounded-full bg-hi-soft text-hi">
            <AlertTriangle size={20} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-[17px] font-bold">
              {title}
            </h2>
            <p
              id="confirm-message"
              className="mt-1 break-words text-sm leading-relaxed text-muted"
            >
              {message}
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button className={btn} ref={cancelRef} onClick={onCancel}>
            Cancel
          </button>
          <button className={btnDanger} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
