"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/components/Toast";
import {
  btnGhost,
  btnPrimary,
  btnPrimarySm,
  btnSm,
  field,
  iconBtn,
} from "@/components/ui";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  ChevronRight,
  Columns,
  Copy,
  GripVertical,
  MoreHorizontal,
  Plus,
  Search,
  Trash,
  X,
} from "@/components/icons";

const uid = () => Math.random().toString(36).slice(2, 10);

const PRIOS = [
  ["", "None"],
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];

const PRIO_STYLE = {
  "": "border-line bg-transparent text-muted",
  low: "border-lo/30 bg-lo-soft text-lo",
  medium: "border-med/30 bg-med-soft text-med",
  high: "border-hi/30 bg-hi-soft text-hi",
};

const nt = (n) => (n === 1 ? "1 todo" : n + " todos");

function locate(b, itemId) {
  for (const c of b.columns) {
    for (const g of c.groups) {
      const i = g.items.findIndex((x) => x.id === itemId);
      if (i > -1) return { c, g, i, item: g.items[i] };
    }
  }
  return null;
}

function findGroup(b, groupId) {
  for (const c of b.columns) {
    const g = c.groups.find((x) => x.id === groupId);
    if (g) return { c, g };
  }
  return null;
}

function isTyping(el) {
  return (
    el &&
    (el.tagName === "INPUT" ||
      el.tagName === "TEXTAREA" ||
      el.tagName === "SELECT" ||
      el.isContentEditable)
  );
}

function Highlight({ text, term }) {
  if (!term) return text;
  const lower = text.toLowerCase();
  const parts = [];
  let from = 0;
  let at = lower.indexOf(term);
  let key = 0;
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark
        key={key++}
        className="rounded bg-accent-soft px-0.5 text-accent"
      >
        {text.slice(at, at + term.length)}
      </mark>
    );
    from = at + term.length;
    at = lower.indexOf(term, from);
  }
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

function SaveStatus({ state }) {
  const dot =
    state === "error" ? "bg-hi" : state === "saved" ? "bg-lo" : "bg-med";
  const label =
    state === "error" ? "Save failed" : state === "saving" ? "Saving…" : "Saved";
  return (
    <span
      className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line bg-card px-2.5 text-[11px] font-semibold text-muted"
      title={label}
    >
      <span
        className={`size-1.5 rounded-full ${dot} ${
          state === "saving" ? "animate-pulse" : ""
        }`}
      />
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}

export default function Board({ project }) {
  const [name, setName] = useState(project.name);
  const [board, setBoard] = useState(() => ({
    columns: Array.isArray(project.board?.columns) ? project.board.columns : [],
  }));
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [prioFilter, setPrioFilter] = useState("all");
  const [composing, setComposing] = useState(null);
  const [draft, setDraft] = useState("");
  const [draftPrio, setDraftPrio] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null);
  const [colOver, setColOver] = useState(null);
  const [saveState, setSaveState] = useState("saved");
  const [menuFor, setMenuFor] = useState(null);
  const [collapsed, setCollapsed] = useState({});

  const toast = useToast();
  const dragRef = useRef(null);
  const boardElRef = useRef(null);
  const composerRef = useRef(null);
  const newColRef = useRef(null);
  const searchRef = useRef(null);
  const cancelEditRef = useRef(false);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  // ---------- persistence ----------
  function flush() {
    const b = pending.current;
    if (!b) return;
    pending.current = null;
    fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board: b }),
      keepalive: true,
    })
      .then((res) => {
        if (!res.ok) throw new Error();
        setSaveState("saved");
      })
      .catch(() => setSaveState("error"));
  }
  function saveBoard(next) {
    pending.current = next;
    setSaveState("saving");
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 400);
  }
  useEffect(
    () => () => {
      clearTimeout(saveTimer.current);
      if (pending.current) flush();
    },
    []
  );

  function mutate(fn) {
    const next = structuredClone(board);
    fn(next);
    setBoard(next);
    saveBoard(next);
  }

  function restore(snapshot) {
    setBoard(snapshot);
    saveBoard(snapshot);
  }

  function removeWithUndo(fn, message) {
    const snapshot = board;
    mutate(fn);
    toast({
      message,
      actionLabel: "Undo",
      onAction: () => restore(snapshot),
    });
  }

  // ---------- keyboard shortcut for search ----------
  useEffect(() => {
    function onKey(e) {
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if ((e.key === "/" || cmdK) && !isTyping(e.target)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // ---------- close item menu on outside click ----------
  useEffect(() => {
    if (!menuFor) return;
    function onDown(e) {
      if (e.target.closest("[data-menu-root]")) return;
      if (e.target.closest(`[data-menu-trigger="${menuFor}"]`)) return;
      setMenuFor(null);
    }
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [menuFor]);

  // ---------- composers ----------
  useEffect(() => {
    if (composing) composerRef.current?.focus();
  }, [composing]);

  function openComposer(kind, id) {
    setComposing({ kind, id });
    setDraft("");
    setDraftPrio("");
  }
  function cancelComposer() {
    setComposing(null);
    setDraft("");
    setDraftPrio("");
  }
  function commit(kind, id) {
    const v = draft.trim();
    if (!v) {
      composerRef.current?.focus();
      return;
    }
    if (kind === "item") {
      mutate((b) => {
        const f = findGroup(b, id);
        if (f)
          f.g.items.push({ id: uid(), text: v, done: false, prio: draftPrio });
      });
      setComposing({ kind: "item", id });
    } else if (kind === "group") {
      const gid = uid();
      mutate((b) => {
        const c = b.columns.find((x) => x.id === id);
        if (c) c.groups.push({ id: gid, title: v, items: [] });
      });
      setComposing({ kind: "item", id: gid });
    } else {
      const cid = uid();
      mutate((b) => {
        b.columns.push({ id: cid, title: v, groups: [] });
      });
      setComposing({ kind: "group", id: cid });
    }
    setDraft("");
    setDraftPrio("");
  }
  function onComposerKey(e, kind, id) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit(kind, id);
    } else if (e.key === "Escape") {
      cancelComposer();
    }
  }

  // ---------- project name ----------
  function saveName() {
    const v = name.trim();
    if (!v) {
      setName(project.name);
      return;
    }
    if (v === project.name) return;
    fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: v }),
    }).catch(() => {});
  }

  // ---------- item actions ----------
  function toggleItem(id) {
    mutate((b) => {
      const f = locate(b, id);
      if (f) f.item.done = !f.item.done;
    });
  }
  function setPrio(id, prio) {
    mutate((b) => {
      const f = locate(b, id);
      if (f) f.item.prio = prio;
    });
  }
  function startEdit(id) {
    setEditing(id);
    setMenuFor(null);
  }
  function onEditKey(e, id) {
    if (e.key === "Enter") e.target.blur();
    else if (e.key === "Escape") {
      cancelEditRef.current = true;
      setEditing(null);
    }
  }
  function commitEdit(id, value) {
    if (cancelEditRef.current) {
      cancelEditRef.current = false;
      return;
    }
    const v = value.trim();
    setEditing(null);
    if (!v) return;
    mutate((b) => {
      const f = locate(b, id);
      if (f) f.item.text = v;
    });
  }
  function moveItemBy(id, delta) {
    setMenuFor(null);
    mutate((b) => {
      const f = locate(b, id);
      if (!f) return;
      const j = f.i + delta;
      if (j < 0 || j >= f.g.items.length) return;
      const arr = f.g.items;
      [arr[f.i], arr[j]] = [arr[j], arr[f.i]];
    });
  }
  function duplicateItem(id) {
    setMenuFor(null);
    mutate((b) => {
      const f = locate(b, id);
      if (!f) return;
      const copy = { ...structuredClone(f.item), id: uid() };
      f.g.items.splice(f.i + 1, 0, copy);
    });
  }

  // ---------- renames ----------
  function renameCol(id, title) {
    mutate((b) => {
      const c = b.columns.find((x) => x.id === id);
      if (c) c.title = title;
    });
  }
  function normalizeCol(id) {
    mutate((b) => {
      const c = b.columns.find((x) => x.id === id);
      if (c && !c.title.trim()) c.title = "Untitled";
    });
  }
  function renameGroup(id, title) {
    mutate((b) => {
      const f = findGroup(b, id);
      if (f) f.g.title = title;
    });
  }
  function normalizeGroup(id) {
    mutate((b) => {
      const f = findGroup(b, id);
      if (f && !f.g.title.trim()) f.g.title = "Untitled";
    });
  }

  // ---------- deletes ----------
  function deleteItem(it) {
    setMenuFor(null);
    removeWithUndo((b) => {
      const f = locate(b, it.id);
      if (f) f.g.items.splice(f.i, 1);
    }, "Todo deleted");
  }
  function askDeleteGroup(g) {
    setConfirm({
      title: "Delete sub-category?",
      message: `“${g.title}” and its ${nt(g.items.length)} will be removed.`,
      onYes: () =>
        removeWithUndo((b) => {
          const f = findGroup(b, g.id);
          if (f) f.c.groups = f.c.groups.filter((x) => x.id !== g.id);
        }, "Sub-category deleted"),
    });
  }
  function askDeleteCol(c) {
    const todos = c.groups.reduce((n, g) => n + g.items.length, 0);
    setConfirm({
      title: "Delete column?",
      message: `“${c.title}” and its ${nt(todos)} will be removed.`,
      onYes: () =>
        removeWithUndo((b) => {
          b.columns = b.columns.filter((x) => x.id !== c.id);
        }, "Column deleted"),
    });
  }

  // ---------- filtering ----------
  const term = q.trim().toLowerCase();
  const filtering = Boolean(term) || status !== "all" || prioFilter !== "all";

  function matches(it) {
    if (status === "open" && it.done) return false;
    if (status === "done" && !it.done) return false;
    if (prioFilter !== "all" && (it.prio || "") !== prioFilter) return false;
    if (term && !it.text.toLowerCase().includes(term)) return false;
    return true;
  }
  const visibleItems = (g) => g.items.filter(matches);

  const stats = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const c of board.columns) {
      for (const g of c.groups) {
        for (const i of g.items) {
          total += 1;
          if (i.done) done += 1;
        }
      }
    }
    return {
      total,
      done,
      pct: total ? Math.round((done / total) * 100) : 0,
    };
  }, [board]);

  // ---------- drag & drop ----------
  function onColDragStart(e, id) {
    dragRef.current = { type: "col", id };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {}
    setTimeout(() => setDraggingId(id), 0);
  }
  function onColDragOver(e, colId) {
    if (dragRef.current?.type !== "col") return;
    e.preventDefault();
    const r = e.currentTarget.getBoundingClientRect();
    setColOver({ id: colId, before: e.clientX < r.left + r.width / 2 });
  }
  function onColDrop(e, targetId) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag || drag.type !== "col" || drag.id === targetId) return;
    const before = colOver ? colOver.before : true;
    mutate((b) => {
      const from = b.columns.findIndex((c) => c.id === drag.id);
      if (from < 0) return;
      const [moved] = b.columns.splice(from, 1);
      let to = b.columns.findIndex((c) => c.id === targetId);
      if (to < 0) {
        b.columns.splice(from, 0, moved);
        return;
      }
      b.columns.splice(before ? to : to + 1, 0, moved);
    });
    setColOver(null);
  }

  function onItemDragStart(e, id) {
    dragRef.current = { type: "item", id };
    e.dataTransfer.effectAllowed = "move";
    try {
      e.dataTransfer.setData("text/plain", id);
    } catch {}
    setTimeout(() => setDraggingId(id), 0);
  }
  function onItemsDragOver(e, g) {
    if (dragRef.current?.type !== "item") return;
    e.preventDefault();
    const els = Array.from(
      e.currentTarget.querySelectorAll("li[data-item]:not([data-dragging])")
    );
    let refId = null;
    for (const el of els) {
      const r = el.getBoundingClientRect();
      if (e.clientY < r.top + r.height / 2) {
        refId = el.dataset.item;
        break;
      }
    }
    const vis = visibleItems(g);
    let at = refId ? vis.findIndex((i) => i.id === refId) : vis.length;
    if (at < 0) at = vis.length;
    setDropTarget({ groupId: g.id, at });
  }
  function onItemsDrop(e, g) {
    e.preventDefault();
    const drag = dragRef.current;
    if (!drag || drag.type !== "item") return;
    const vis = visibleItems(g);
    const dt =
      dropTarget && dropTarget.groupId === g.id
        ? dropTarget
        : { groupId: g.id, at: vis.length };
    const refItem = dt.at < vis.length ? vis[dt.at] : null;
    const idx = refItem
      ? g.items.findIndex((i) => i.id === refItem.id)
      : g.items.length;
    moveItemTo(drag.id, g.id, idx);
  }
  function moveItemTo(itemId, toGroupId, index) {
    mutate((b) => {
      const f = locate(b, itemId);
      if (!f) return;
      f.g.items.splice(f.i, 1);
      const t = findGroup(b, toGroupId);
      if (t) t.g.items.splice(Math.min(index, t.g.items.length), 0, f.item);
    });
    setDropTarget(null);
  }
  function onDragEnd() {
    dragRef.current = null;
    setDraggingId(null);
    setDropTarget(null);
    setColOver(null);
  }

  // ---------- column resize ----------
  function onResizeDown(e, colId) {
    e.preventDefault();
    const handle = e.target;
    const el = handle.closest("[data-col]");
    const x0 = e.clientX;
    const w0 = el.getBoundingClientRect().width;
    let last = Math.round(w0);
    handle.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const max = Math.max(260, boardElRef.current.clientWidth - 40);
      const w = Math.max(260, Math.min(w0 + ev.clientX - x0, max));
      el.style.setProperty("--w", w + "px");
      last = Math.round(w);
    };
    const up = () => {
      handle.removeEventListener("pointermove", mv);
      handle.removeEventListener("pointerup", up);
      handle.removeEventListener("pointercancel", up);
      mutate((b) => {
        const c = b.columns.find((x) => x.id === colId);
        if (c) c.w = last;
      });
    };
    handle.addEventListener("pointermove", mv);
    handle.addEventListener("pointerup", up);
    handle.addEventListener("pointercancel", up);
  }

  // ---------- render helpers ----------
  function composer(kind, id, ph) {
    return (
      <div className="rounded-xl border border-accent/40 bg-card p-2 shadow-soft">
        <input
          ref={composerRef}
          className="w-full rounded-lg border border-line bg-bg px-2.5 py-2 text-base text-ink outline-none placeholder:text-muted/70 focus:border-accent sm:text-[15px]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => onComposerKey(e, kind, id)}
          placeholder={ph}
          maxLength={120}
          aria-label={ph}
        />
        <div className="mt-2 flex items-center gap-2">
          {kind === "item" && (
            <select
              className={`min-w-0 cursor-pointer rounded-lg border px-2 py-1.5 text-xs font-bold outline-none sm:text-[13px] ${PRIO_STYLE[draftPrio]}`}
              value={draftPrio}
              onChange={(e) => setDraftPrio(e.target.value)}
              aria-label="Priority"
            >
              <option value="">No priority</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          )}
          <div className="ml-auto flex items-center gap-1.5">
            <button className={btnSm} onClick={cancelComposer}>
              Cancel
            </button>
            <button className={btnPrimarySm} onClick={() => commit(kind, id)}>
              Add
            </button>
          </div>
        </div>
      </div>
    );
  }

  function itemHtml(it) {
    const ed = editing === it.id;
    const ps = PRIO_STYLE[it.prio || ""] || PRIO_STYLE[""];
    return (
      <li
        key={it.id}
        className={`group/item relative flex items-start gap-1.5 rounded-lg px-1 py-1.5 transition-colors hover:bg-bg-2/70 ${
          it.done ? "text-muted" : ""
        } ${draggingId === it.id ? "opacity-40" : ""}`}
        data-item={it.id}
        data-dragging={draggingId === it.id ? "" : undefined}
        draggable={!ed}
        onDragStart={(e) => onItemDragStart(e, it.id)}
        onDragEnd={onDragEnd}
      >
        <span className="mt-0.5 hidden shrink-0 cursor-grab text-muted/60 opacity-0 transition-opacity group-hover/item:opacity-100 sm:block">
          <GripVertical size={15} />
        </span>
        <button
          type="button"
          role="checkbox"
          aria-checked={it.done}
          aria-label={it.done ? "Mark as not done" : "Mark as done"}
          onClick={() => toggleItem(it.id)}
          className={`mt-0.5 grid size-[18px] flex-none place-items-center rounded-full border-2 transition-all ${
            it.done
              ? "border-lo bg-lo text-white"
              : "border-line hover:border-accent"
          }`}
        >
          {it.done && <Check size={11} strokeWidth={3.2} />}
        </button>

        <div className="min-w-0 flex-1">
          {ed ? (
            <input
              className="w-full rounded-md border border-accent bg-bg px-1.5 py-0.5 text-base text-ink outline-none sm:text-[15px]"
              defaultValue={it.text}
              maxLength={120}
              ref={(el) => {
                if (el) {
                  el.focus();
                  el.select();
                }
              }}
              onKeyDown={(e) => onEditKey(e, it.id)}
              onBlur={(e) => commitEdit(it.id, e.target.value)}
            />
          ) : (
            <span
              className={`block cursor-text break-words text-[14.5px] leading-snug ${
                it.done ? "line-through" : ""
              }`}
              onClick={() => startEdit(it.id)}
            >
              <Highlight text={it.text} term={term} />
            </span>
          )}
          <div className="mt-1 flex items-center gap-1.5">
            <select
              className={`cursor-pointer rounded-full border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide outline-none ${ps} [&_option]:bg-card [&_option]:text-ink`}
              value={it.prio || ""}
              onChange={(e) => setPrio(it.id, e.target.value)}
              aria-label="Priority"
            >
              {PRIOS.map(([v, label]) => (
                <option key={v} value={v}>
                  {label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          data-menu-trigger={it.id}
          className={`${iconBtn} -my-1 size-7 shrink-0 opacity-0 group-hover/item:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100`}
          onClick={() => setMenuFor(menuFor === it.id ? null : it.id)}
          title="Todo actions"
          aria-label="Todo actions"
        >
          <MoreHorizontal size={16} />
        </button>

        {menuFor === it.id && (
          <div
            data-menu-root
            className="animate-pop-in absolute top-8 right-1 z-20 w-40 overflow-hidden rounded-xl border border-line bg-card p-1 shadow-float"
          >
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium hover:bg-bg-2"
              onClick={() => moveItemBy(it.id, -1)}
            >
              <ArrowUp size={14} /> Move up
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium hover:bg-bg-2"
              onClick={() => moveItemBy(it.id, 1)}
            >
              <ArrowDown size={14} /> Move down
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium hover:bg-bg-2"
              onClick={() => duplicateItem(it.id)}
            >
              <Copy size={14} /> Duplicate
            </button>
            <div className="my-1 h-px bg-line" />
            <button
              className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] font-medium text-hi hover:bg-hi-soft"
              onClick={() => deleteItem(it)}
            >
              <Trash size={14} /> Delete
            </button>
          </div>
        )}
      </li>
    );
  }

  function groupHtml(g) {
    const vis = visibleItems(g);
    if (filtering && !vis.length) return null;
    const done = g.items.filter((i) => i.done).length;
    const pct = g.items.length ? Math.round((done / g.items.length) * 100) : 0;
    const open = composing?.kind === "item" && composing.id === g.id;
    const showLine = dropTarget?.groupId === g.id;
    return (
      <div
        className="rounded-xl border border-line/80 bg-card shadow-soft"
        key={g.id}
        data-group={g.id}
      >
        <div className="flex items-center gap-1 px-2 pt-1.5 pb-0.5">
          <input
            className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 py-1 text-[13.5px] font-bold text-ink hover:bg-bg-2"
            value={g.title}
            maxLength={40}
            aria-label="Sub-category name"
            onChange={(e) => renameGroup(g.id, e.target.value)}
            onBlur={() => normalizeGroup(g.id)}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <span className="shrink-0 rounded-full bg-bg-2 px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-muted">
            {done}/{g.items.length}
          </span>
          <button
            className={`${iconBtn} size-7 shrink-0 opacity-60 hover:opacity-100`}
            onClick={() => askDeleteGroup(g)}
            title="Delete sub-category"
            aria-label="Delete sub-category"
          >
            <Trash size={14} />
          </button>
        </div>

        <div className="mx-2.5 mt-1 mb-1.5 h-1 overflow-hidden rounded-full bg-line/70">
          <i
            style={{ width: pct + "%" }}
            className="block h-full rounded-full bg-lo transition-all duration-500"
          />
        </div>

        <ul
          className="flex list-none flex-col gap-0.5 px-1.5"
          onDragOver={(e) => onItemsDragOver(e, g)}
          onDrop={(e) => onItemsDrop(e, g)}
        >
          {vis.map((it, idx) => (
            <Fragment key={it.id}>
              {showLine && dropTarget.at === idx && (
                <li className="my-0.5 h-[3px] list-none rounded-full bg-accent" />
              )}
              {itemHtml(it)}
            </Fragment>
          ))}
          {showLine && dropTarget.at >= vis.length && (
            <li className="my-0.5 h-[3px] list-none rounded-full bg-accent" />
          )}
          {!vis.length && (
            <li className="list-none px-1.5 py-2 text-[13px] text-muted">
              {filtering ? "No matching todos." : "No todos yet."}
            </li>
          )}
        </ul>

        <div className="px-1.5 pt-1 pb-1.5">
          {open ? (
            composer("item", g.id, "Write a todo…")
          ) : (
            <button
              className="flex w-full cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[13px] font-semibold text-muted transition-colors hover:bg-bg-2 hover:text-ink"
              onClick={() => openComposer("item", g.id)}
            >
              <Plus size={14} /> Add todo
            </button>
          )}
        </div>
      </div>
    );
  }

  function colHtml(c) {
    const total = c.groups.reduce((n, g) => n + g.items.length, 0);
    const done = c.groups.reduce(
      (n, g) => n + g.items.filter((i) => i.done).length,
      0
    );
    const open = composing?.kind === "group" && composing.id === c.id;
    const body = c.groups.map(groupHtml).filter(Boolean);
    const over =
      colOver?.id === c.id
        ? colOver.before
          ? "before:absolute before:inset-y-0 before:-left-2 before:w-[3px] before:rounded-full before:bg-accent before:content-['']"
          : "after:absolute after:inset-y-0 after:-right-2 after:w-[3px] after:rounded-full after:bg-accent after:content-['']"
        : "";

    if (collapsed[c.id]) {
      return (
        <section
          key={c.id}
          className="flex w-full flex-none items-center gap-2 rounded-2xl border border-line/60 bg-col px-2 py-2 shadow-soft sm:w-14 sm:flex-col sm:py-2.5"
          data-col={c.id}
        >
          <button
            className={`${iconBtn} size-8`}
            onClick={() => setCollapsed((s) => ({ ...s, [c.id]: false }))}
            title="Expand column"
            aria-label="Expand column"
          >
            <ChevronRight size={16} />
          </button>
          <span className="truncate text-sm font-bold sm:[writing-mode:vertical-rl] sm:rotate-180 sm:max-h-48">
            {c.title}
          </span>
          <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold text-muted">
            {done}/{total}
          </span>
          <button
            className={`${iconBtn} size-8 sm:mt-auto`}
            onClick={() => askDeleteCol(c)}
            title="Delete column"
            aria-label="Delete column"
          >
            <Trash size={14} />
          </button>
        </section>
      );
    }

    return (
      <section
        key={c.id}
        className={`group/col relative flex w-full max-w-full flex-none flex-col rounded-2xl border border-line/60 bg-col shadow-soft transition-colors sm:w-[var(--w,340px)] ${
          draggingId === c.id ? "opacity-45" : ""
        } ${over}`}
        data-col={c.id}
        style={c.w ? { "--w": `${c.w}px` } : undefined}
        onDragOver={(e) => onColDragOver(e, c.id)}
        onDrop={(e) => onColDrop(e, c.id)}
      >
        <div className="flex items-center gap-0.5 px-2 pt-2 pb-1">
          <span
            className="cursor-grab touch-manipulation select-none rounded-md p-1 leading-none text-muted/70 opacity-60 transition-opacity hover:bg-card hover:text-ink hover:opacity-100"
            draggable
            title="Drag to move column"
            aria-label="Drag to move column"
            onDragStart={(e) => onColDragStart(e, c.id)}
            onDragEnd={onDragEnd}
          >
            <GripVertical size={16} />
          </span>
          <input
            className="min-w-0 flex-1 rounded-md border-0 bg-transparent px-1.5 py-1 text-[15px] font-bold text-ink hover:bg-card/60"
            value={c.title}
            maxLength={40}
            aria-label="Column name"
            onChange={(e) => renameCol(c.id, e.target.value)}
            onBlur={() => normalizeCol(c.id)}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <span className="shrink-0 rounded-full bg-card px-2 py-0.5 text-[11px] font-bold whitespace-nowrap text-muted">
            {total}
          </span>
          <button
            className={`${iconBtn} size-7 shrink-0`}
            onClick={() => setCollapsed((s) => ({ ...s, [c.id]: true }))}
            title="Collapse column"
            aria-label="Collapse column"
          >
            <ChevronDown size={15} />
          </button>
          <button
            className={`${iconBtn} size-7 shrink-0`}
            onClick={() => askDeleteCol(c)}
            title="Delete column"
            aria-label="Delete column"
          >
            <Trash size={14} />
          </button>
        </div>

        <div className="mx-2.5 mb-2 h-1 overflow-hidden rounded-full bg-line/60">
          <i
            className="block h-full rounded-full bg-accent/70 transition-all duration-500"
            style={{ width: `${total ? (done / total) * 100 : 0}%` }}
          />
        </div>

        <div className="flex flex-col gap-2.5 px-2 pb-1">
          {body.length ? (
            body
          ) : (
            <div className="rounded-xl border border-dashed border-line px-3 py-3 text-[13px] text-muted">
              {filtering
                ? "No matching todos."
                : "Add a sub-category, such as a profile or project, to start adding todos."}
            </div>
          )}
        </div>

        <div className="px-2 pt-1.5 pb-2">
          {open ? (
            composer("group", c.id, "Sub-category name…")
          ) : (
            <button
              className="flex w-full cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg border-0 bg-transparent px-2 py-1.5 text-left text-[13px] font-semibold text-muted transition-colors hover:bg-card hover:text-ink"
              onClick={() => openComposer("group", c.id)}
            >
              <Plus size={14} /> Add sub-category
            </button>
          )}
        </div>

        <div
          className="absolute inset-y-0 -right-1.5 hidden w-3.5 cursor-ew-resize touch-none sm:block"
          title="Drag to resize column"
          aria-label="Resize column"
          onPointerDown={(e) => onResizeDown(e, c.id)}
        >
          <span className="absolute top-1/2 left-[5px] h-10 w-1 -translate-y-1/2 rounded bg-muted opacity-20 transition-opacity group-hover/col:opacity-50" />
        </div>
      </section>
    );
  }

  function addColClick() {
    openComposer("col", "");
    requestAnimationFrame(() => {
      newColRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  const addColPlaceholder = composing?.kind === "col" ? (
    <div
      ref={newColRef}
      className="w-full flex-none rounded-2xl border-2 border-accent/40 bg-col sm:w-80"
    >
      {composer("col", "", "Column name…")}
    </div>
  ) : (
    <button
      className="flex min-h-14 w-full flex-none cursor-pointer touch-manipulation items-center gap-2 rounded-2xl border-2 border-dashed border-line bg-transparent px-4 py-3 text-left text-sm font-semibold text-muted transition-colors hover:border-accent hover:text-ink sm:w-80"
      onClick={() => openComposer("col", "")}
    >
      <Plus size={16} /> Add column
    </button>
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/85 backdrop-blur-xl">
        <div className="mx-auto w-full max-w-[1700px] px-3 sm:px-5">
          <div className="flex flex-wrap items-center gap-2 py-2.5">
            <Link href="/" className={`${btnGhost} shrink-0`}>
              <ArrowLeft size={16} />
              <span className="hidden sm:inline">Projects</span>
            </Link>
            <div className="hidden h-5 w-px bg-line sm:block" />
            <input
              className="min-w-0 flex-1 rounded-lg border-0 bg-transparent px-1 py-1 text-lg font-extrabold tracking-tight text-ink outline-none hover:bg-card/50 focus:bg-card/60 sm:text-xl"
              value={name}
              maxLength={80}
              aria-label="Project name"
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            />
            <div className="flex shrink-0 items-center gap-1.5">
              <div className="hidden items-center gap-2 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-semibold md:flex">
                <span className="text-muted">
                  {stats.done}/{stats.total}
                </span>
                <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                  <i
                    className="block h-full rounded-full bg-lo transition-all duration-500"
                    style={{ width: `${stats.pct}%` }}
                  />
                </span>
                <span className="text-ink">{stats.pct}%</span>
              </div>
              <SaveStatus state={saveState} />
              <ThemeToggle compact />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pb-2.5">
            <div className="relative min-w-[160px] flex-1 sm:max-w-xs">
              <Search
                size={16}
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-muted"
              />
              <input
                ref={searchRef}
                className={`${field} py-1.5 pr-8 pl-8 text-sm`}
                type="text"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && setQ("")}
                placeholder="Search todos  ( / )"
                aria-label="Search todos"
              />
              {q && (
                <button
                  className="absolute top-1/2 right-1.5 grid size-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:bg-bg-2 hover:text-ink"
                  onClick={() => setQ("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center rounded-lg border border-line bg-card p-0.5 text-[13px] font-semibold">
              {[
                ["all", "All"],
                ["open", "Open"],
                ["done", "Done"],
              ].map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setStatus(v)}
                  className={`rounded-md px-2.5 py-1 transition-colors ${
                    status === v
                      ? "bg-accent text-accent-ink shadow-soft"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <select
              className={`${field} h-8 w-auto cursor-pointer py-0 text-[13px] font-semibold`}
              value={prioFilter}
              onChange={(e) => setPrioFilter(e.target.value)}
              aria-label="Filter by priority"
            >
              <option value="all">Any priority</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="">No priority</option>
            </select>

            <button className={`${btnPrimary} ml-auto`} onClick={addColClick}>
              <Plus size={16} />
              Add column
            </button>
          </div>
        </div>
      </header>

      <main
        className="mx-auto flex w-full max-w-[1700px] flex-col gap-3 px-3 py-4 pb-[calc(2rem+env(safe-area-inset-bottom,0px))] sm:flex-row sm:flex-nowrap sm:items-start sm:gap-4 sm:overflow-x-auto sm:px-5 sm:pb-6"
        ref={boardElRef}
      >
        {board.columns.length === 0 && composing?.kind !== "col" ? (
          <div className="animate-pop-in flex w-full flex-col items-center rounded-2xl border border-dashed border-line bg-card/50 px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Columns size={26} />
            </span>
            <h2 className="mt-4 text-lg font-bold">This board is empty</h2>
            <p className="mt-1 max-w-sm text-sm text-muted">
              Columns hold sub-categories, and sub-categories hold your todos.
              Add your first column to get going.
            </p>
            <button className={`${btnPrimary} mt-5`} onClick={addColClick}>
              <Plus size={16} /> Add your first column
            </button>
          </div>
        ) : (
          <>
            {board.columns.map(colHtml)}
            {addColPlaceholder}
          </>
        )}
      </main>

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onConfirm={() => {
            const fn = confirm.onYes;
            setConfirm(null);
            fn();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </>
  );
}
