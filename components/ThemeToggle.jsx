"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [theme, setTheme] = useState(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem("kanban-theme", next);
    } catch {}
    setTheme(next);
  }

  return (
    <button
      className="btn"
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle light / dark"
    >
      {theme === "dark" ? "Light" : "Dark"}
    </button>
  );
}
