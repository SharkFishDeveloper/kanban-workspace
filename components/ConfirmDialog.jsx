"use client";

import { useEffect, useRef } from "react";

export default function ConfirmDialog({ title, message, onConfirm, onCancel }) {
  const yesRef = useRef(null);

  useEffect(() => {
    yesRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="dlg-backdrop" onClick={onCancel}>
      <div
        className="dlg"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{message}</p>
        <div className="actions">
          <button className="btn" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn danger" ref={yesRef} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
