"use client";

import { Moon, Sun } from "@/components/icons";
import { btn } from "@/components/ui";

export default function ThemeToggle({ compact = false }) {
  function toggle() {
    const root = document.documentElement;
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try {
      localStorage.setItem("kanban-theme", next);
    } catch {}
  }

  return (
    <button
      className={compact ? "size-9 inline-flex items-center justify-center rounded-lg text-muted hover:bg-bg-2 hover:text-ink" : btn}
      onClick={toggle}
      aria-label="Toggle color theme"
      title="Toggle light / dark"
    >
      <Sun size={16} className="hidden dark:block" />
      <Moon size={16} className="dark:hidden" />
      {!compact && (
        <span className="hidden sm:inline">
          <span className="dark:hidden">Dark</span>
          <span className="hidden dark:inline">Light</span>
        </span>
      )}
    </button>
  );
}
