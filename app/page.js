"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";

export default function HomePage() {
  const [projects, setProjects] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  async function load() {
    const res = await fetch("/api/projects");
    setProjects(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function create(e) {
    e.preventDefault();
    const n = name.trim();
    if (!n || busy) return;
    setBusy(true);
    await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: n }),
    });
    setName("");
    await load();
    setBusy(false);
  }

  async function confirmDelete() {
    const id = toDelete.id;
    setToDelete(null);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <>
      <header className="top">
        <h1>Kanban boards</h1>
        <form className="create-row" onSubmit={create}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New project name"
            maxLength={80}
            aria-label="New project name"
          />
          <button className="btn primary" disabled={busy || !name.trim()}>
            Create
          </button>
        </form>
        <ThemeToggle />
      </header>

      {projects === null ? (
        <div className="empty-state">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="empty-state">
          No projects yet. Create one above to get started.
        </div>
      ) : (
        <main className="projects">
          {projects.map((p) => (
            <div key={p.id} className="pcard-wrap">
              <Link href={`/project/${p.id}`} className="pcard">
                <h2>{p.name}</h2>
                <span className="meta">
                  {p.columns} {p.columns === 1 ? "column" : "columns"} ·{" "}
                  {p.todos} {p.todos === 1 ? "todo" : "todos"}
                </span>
                <span className="meta">
                  Created {new Date(p.createdAt).toLocaleDateString()}
                </span>
              </Link>
              <button
                className="icon"
                onClick={() => setToDelete(p)}
                title="Delete project"
                aria-label={`Delete ${p.name}`}
              >
                ✕
              </button>
            </div>
          ))}
        </main>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete project?"
          message={`“${toDelete.name}” and its ${toDelete.todos} ${
            toDelete.todos === 1 ? "todo" : "todos"
          } will be removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
