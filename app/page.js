"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import { btnPrimary, field, iconBtn } from "@/components/ui";
import {
  CheckCircle,
  Columns,
  Folder,
  Grid,
  ListChecks,
  Plus,
  Trash,
} from "@/components/icons";

function timeAgo(ts) {
  const secs = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function Stat({ icon, value, label }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-line/70 bg-card/70 px-3 py-2 backdrop-blur">
      <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">
        {icon}
      </span>
      <div className="leading-tight">
        <div className="text-base font-bold">{value}</div>
        <div className="text-[11px] font-medium text-muted">{label}</div>
      </div>
    </div>
  );
}

function ProjectCard({ project, onDelete }) {
  const pct = project.todos
    ? Math.round((project.done / project.todos) * 100)
    : 0;
  return (
    <div className="group relative">
      <Link
        href={`/project/${project.id}`}
        className="flex h-full flex-col gap-4 rounded-2xl border border-line bg-card p-4 text-ink no-underline shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-pop"
      >
        <div className="flex items-start gap-3 pr-8">
          <span className="grid size-10 flex-none place-items-center rounded-xl bg-accent-soft text-accent">
            <Folder size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-bold">{project.name}</h2>
            <p className="mt-0.5 text-xs text-muted">
              Updated {timeAgo(project.updatedAt)}
            </p>
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between text-xs">
            <span className="font-medium text-muted">
              {project.todos === 0
                ? "No todos yet"
                : `${project.done} of ${project.todos} done`}
            </span>
            <span className="font-bold text-ink">{pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-line/70">
            <i
              className="block h-full rounded-full bg-lo transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5">
            <Columns size={14} />
            {project.columns} {project.columns === 1 ? "column" : "columns"}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <ListChecks size={14} />
            {project.todos} {project.todos === 1 ? "todo" : "todos"}
          </span>
        </div>
      </Link>
      <button
        className={`${iconBtn} absolute top-2.5 right-2.5 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`}
        onClick={() => onDelete(project)}
        title="Delete project"
        aria-label={`Delete ${project.name}`}
      >
        <Trash size={15} />
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-line bg-card p-4 shadow-soft">
      <div className="flex items-start gap-3">
        <div className="skeleton size-10 rounded-xl" />
        <div className="flex-1 space-y-2">
          <div className="skeleton h-3.5 w-2/3 rounded-full" />
          <div className="skeleton h-2.5 w-1/3 rounded-full" />
        </div>
      </div>
      <div className="mt-5 space-y-2">
        <div className="skeleton h-2.5 w-full rounded-full" />
        <div className="skeleton h-1.5 w-full rounded-full" />
      </div>
      <div className="mt-4 flex gap-3">
        <div className="skeleton h-2.5 w-20 rounded-full" />
        <div className="skeleton h-2.5 w-16 rounded-full" />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [projects, setProjects] = useState(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const inputRef = useRef(null);
  const toast = useToast();

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
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: n }),
      });
      if (!res.ok) throw new Error();
      setName("");
      await load();
      toast({ message: `Created “${n}”` });
      inputRef.current?.focus();
    } catch {
      toast({ message: "Could not create project", variant: "error" });
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    const project = toDelete;
    setToDelete(null);
    await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    await load();
    toast({ message: `Deleted “${project.name}”` });
  }

  const stats = useMemo(() => {
    const list = projects || [];
    return {
      projects: list.length,
      todos: list.reduce((n, p) => n + p.todos, 0),
      done: list.reduce((n, p) => n + p.done, 0),
    };
  }, [projects]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:px-6">
      <header className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:py-8">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-accent text-accent-ink shadow-pop">
            <Grid size={22} />
          </span>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">
              Kanban
            </h1>
            <p className="text-sm text-muted">Your personal workspace</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden gap-2 sm:flex">
            <Stat icon={<Grid size={15} />} value={stats.projects} label="Boards" />
            <Stat icon={<ListChecks size={15} />} value={stats.todos} label="Todos" />
            <Stat icon={<CheckCircle size={15} />} value={stats.done} label="Done" />
          </div>
          <ThemeToggle />
        </div>
      </header>

      <form
        className="mb-6 flex flex-col gap-2 rounded-2xl border border-line bg-card p-3 shadow-soft sm:flex-row"
        onSubmit={create}
      >
        <div className="relative flex-1">
          <Plus
            size={17}
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <input
            ref={inputRef}
            className={`${field} pl-9`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name your next project…"
            maxLength={80}
            aria-label="New project name"
          />
        </div>
        <button
          className={`${btnPrimary} shrink-0 sm:px-5`}
          disabled={busy || !name.trim()}
        >
          {busy ? "Creating…" : "Create project"}
        </button>
      </form>

      {projects === null ? (
        <main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </main>
      ) : projects.length === 0 ? (
        <div className="animate-pop-in flex flex-col items-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
            <Folder size={26} />
          </span>
          <h2 className="mt-4 text-lg font-bold">No boards yet</h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Create your first project above and start organizing your todos.
          </p>
          <button
            className={`${btnPrimary} mt-5`}
            onClick={() => inputRef.current?.focus()}
          >
            <Plus size={16} />
            New project
          </button>
        </div>
      ) : (
        <main className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} onDelete={setToDelete} />
          ))}
        </main>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Delete project?"
          message={`“${toDelete.name}” and its ${toDelete.todos} ${
            toDelete.todos === 1 ? "todo" : "todos"
          } will be permanently removed.`}
          onConfirm={confirmDelete}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
