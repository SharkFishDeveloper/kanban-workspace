"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ConfirmDialog from "@/components/ConfirmDialog";
import ThemeToggle from "@/components/ThemeToggle";

const uid = () => Math.random().toString(36).slice(2, 10);
const PRIOS = [
  ["", "None"],
  ["low", "Low"],
  ["medium", "Medium"],
  ["high", "High"],
];
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

export default function Board({ project }) {
  const [name, setName] = useState(project.name);
  const [board, setBoard] = useState(() => ({
    columns: Array.isArray(project.board?.columns) ? project.board.columns : [],
  }));
  const [q, setQ] = useState("");
  const [composing, setComposing] = useState(null); // { kind: 'col'|'group'|'item', id }
  const [draft, setDraft] = useState("");
  const [draftPrio, setDraftPrio] = useState("");
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null); // { title, message, onYes }
  const [draggingId, setDraggingId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { groupId, at }
  const [colOver, setColOver] = useState(null); // { id, before }

  const dragRef = useRef(null);
  const boardElRef = useRef(null);
  const composerRef = useRef(null);
  const cancelEditRef = useRef(false);
  const saveTimer = useRef(null);
  const pending = useRef(null);

  // ---------- persistence (debounced PUT of the whole board) ----------
  function flush() {
    const b = pending.current;
    if (!b) return;
    pending.current = null;
    fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ board: b }),
      keepalive: true,
    }).catch(() => {});
  }
  function saveBoard(next) {
    pending.current = next;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(flush, 350);
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
      setComposing({ kind: "item", id }); // keep open for rapid entry
    } else if (kind === "group") {
      const gid = uid();
      mutate((b) => {
        const c = b.columns.find((x) => x.id === id);
        if (c) c.groups.push({ id: gid, title: v, items: [] });
      });
      setComposing({ kind: "item", id: gid }); // jump into first todo
    } else {
      const cid = uid();
      mutate((b) => {
        b.columns.push({ id: cid, title: v, groups: [] });
      });
      setComposing({ kind: "group", id: cid }); // jump into first sub-category
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
  function askDeleteItem(it) {
    setConfirm({
      title: "Delete todo?",
      message: `“${it.text}” will be removed.`,
      onYes: () =>
        mutate((b) => {
          const f = locate(b, it.id);
          if (f) f.g.items.splice(f.i, 1);
        }),
    });
  }
  function askDeleteGroup(g) {
    setConfirm({
      title: "Delete sub-category?",
      message: `“${g.title}” and its ${nt(g.items.length)} will be removed.`,
      onYes: () =>
        mutate((b) => {
          const f = findGroup(b, g.id);
          if (f) f.c.groups = f.c.groups.filter((x) => x.id !== g.id);
        }),
    });
  }
  function askDeleteCol(c) {
    const todos = c.groups.reduce((n, g) => n + g.items.length, 0);
    setConfirm({
      title: "Delete column?",
      message: `“${c.title}” and its ${nt(todos)} will be removed.`,
      onYes: () =>
        mutate((b) => {
          b.columns = b.columns.filter((x) => x.id !== c.id);
        }),
    });
  }

  // ---------- drag & drop ----------
  const term = q.trim().toLowerCase();
  const visibleItems = (g) =>
    g.items.filter((i) => !term || i.text.toLowerCase().includes(term));

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
      e.currentTarget.querySelectorAll(".item:not(.dragging)")
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
    moveItem(drag.id, g.id, idx);
  }
  function moveItem(itemId, toGroupId, index) {
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
    const el = handle.closest(".col");
    const x0 = e.clientX;
    const w0 = el.getBoundingClientRect().width;
    let last = Math.round(w0);
    handle.setPointerCapture(e.pointerId);
    const mv = (ev) => {
      const max = Math.max(240, boardElRef.current.clientWidth - 40);
      const w = Math.max(240, Math.min(w0 + ev.clientX - x0, max));
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
      <div className="composer">
        <input
          ref={composerRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => onComposerKey(e, kind, id)}
          placeholder={ph}
          maxLength={120}
          aria-label={ph}
        />
        <div className="row">
          {kind === "item" && (
            <select
              className="psel"
              value={draftPrio}
              onChange={(e) => setDraftPrio(e.target.value)}
              aria-label="Priority"
            >
              <option value="">No priority</option>
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          )}
          <button className="btn primary" onClick={() => commit(kind, id)}>
            Save
          </button>
          <button className="btn" onClick={cancelComposer}>
            Cancel
          </button>
        </div>
      </div>
    );
  }

  function itemHtml(it) {
    const ed = editing === it.id;
    return (
      <li
        key={it.id}
        className={`item${it.done ? " done" : ""}${
          draggingId === it.id ? " dragging" : ""
        }`}
        data-item={it.id}
        draggable={!ed}
        onDragStart={(e) => onItemDragStart(e, it.id)}
        onDragEnd={onDragEnd}
      >
        <input
          type="checkbox"
          checked={it.done}
          onChange={() => toggleItem(it.id)}
          aria-label="Mark done"
        />
        {ed ? (
          <input
            className="edit"
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
          <span className="txt" onClick={() => startEdit(it.id)}>
            {it.text}
          </span>
        )}
        <select
          className={`prio-sel ${it.prio || ""}`}
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
        <button
          className="icon"
          onClick={() => askDeleteItem(it)}
          title="Delete todo"
          aria-label="Delete todo"
        >
          ✕
        </button>
      </li>
    );
  }

  function groupHtml(g) {
    const vis = visibleItems(g);
    if (term && !vis.length) return null;
    const done = g.items.filter((i) => i.done).length;
    const pct = g.items.length
      ? Math.round((done / g.items.length) * 100)
      : 0;
    const open = composing?.kind === "item" && composing.id === g.id;
    const showLine = dropTarget?.groupId === g.id;
    return (
      <div className="group" key={g.id} data-group={g.id}>
        <div className="g-head">
          <input
            className="g-title"
            value={g.title}
            maxLength={40}
            aria-label="Sub-category name"
            onChange={(e) => renameGroup(g.id, e.target.value)}
            onBlur={() => normalizeGroup(g.id)}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <span className="count">
            {done}/{g.items.length}
          </span>
          <button
            className="icon"
            onClick={() => askDeleteGroup(g)}
            title="Delete sub-category"
            aria-label="Delete sub-category"
          >
            ✕
          </button>
        </div>
        <div className="bar">
          <i style={{ width: pct + "%" }} />
        </div>
        <ul
          className="items"
          onDragOver={(e) => onItemsDragOver(e, g)}
          onDrop={(e) => onItemsDrop(e, g)}
        >
          {vis.map((it, idx) => (
            <Fragment key={it.id}>
              {showLine && dropTarget.at === idx && <li className="drop-line" />}
              {itemHtml(it)}
            </Fragment>
          ))}
          {showLine && dropTarget.at >= vis.length && <li className="drop-line" />}
          {!vis.length && <li className="empty">No todos yet.</li>}
        </ul>
        <div className="g-foot">
          {open ? (
            composer("item", g.id, "Write a todo")
          ) : (
            <button
              className="add"
              onClick={() => openComposer("item", g.id)}
            >
              + Add todo
            </button>
          )}
        </div>
      </div>
    );
  }

  function colHtml(c) {
    const total = c.groups.reduce((n, g) => n + g.items.length, 0);
    const open = composing?.kind === "group" && composing.id === c.id;
    const body = c.groups.map(groupHtml).filter(Boolean);
    const over =
      colOver?.id === c.id
        ? colOver.before
          ? " col-drop-before"
          : " col-drop-after"
        : "";
    return (
      <section
        key={c.id}
        className={`col${draggingId === c.id ? " dragging" : ""}${over}`}
        data-col={c.id}
        style={c.w ? { "--w": `${c.w}px` } : undefined}
        onDragOver={(e) => onColDragOver(e, c.id)}
        onDrop={(e) => onColDrop(e, c.id)}
      >
        <div className="col-head">
          <span
            className="grip"
            draggable
            title="Drag to move column"
            aria-label="Drag to move column"
            onDragStart={(e) => onColDragStart(e, c.id)}
            onDragEnd={onDragEnd}
          >
            ⠿
          </span>
          <input
            className="col-title"
            value={c.title}
            maxLength={40}
            aria-label="Column name"
            onChange={(e) => renameCol(c.id, e.target.value)}
            onBlur={() => normalizeCol(c.id)}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          />
          <span className="count">{total}</span>
          <button
            className="icon"
            onClick={() => askDeleteCol(c)}
            title="Delete column"
            aria-label="Delete column"
          >
            ✕
          </button>
        </div>
        <div className="groups">
          {body.length ? (
            body
          ) : (
            <div className="empty pad">
              {term
                ? "No matching todos."
                : "Add a sub-category, such as a profile or project, to start adding todos."}
            </div>
          )}
        </div>
        <div className="col-foot">
          {open ? (
            composer("group", c.id, "Sub-category name")
          ) : (
            <button
              className="add"
              onClick={() => openComposer("group", c.id)}
            >
              + Add sub-category
            </button>
          )}
        </div>
        <div
          className="resize"
          title="Drag to resize column"
          aria-label="Resize column"
          onPointerDown={(e) => onResizeDown(e, c.id)}
        />
      </section>
    );
  }

  function addColClick() {
    openComposer("col", "");
    requestAnimationFrame(() => {
      document
        .querySelector(".new-col.open")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  return (
    <>
      <header className="top">
        <Link href="/" className="btn">
          ← Projects
        </Link>
        <input
          className="proj-title"
          value={name}
          size={Math.max(8, Math.min(40, name.length))}
          maxLength={80}
          aria-label="Project name"
          onChange={(e) => setName(e.target.value)}
          onBlur={saveName}
          onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        />
        <input
          className="search"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search todos"
          aria-label="Search todos"
        />
        <button className="btn primary" onClick={addColClick}>
          Add column
        </button>
        <ThemeToggle />
      </header>

      <main className="board" ref={boardElRef}>
        {board.columns.map(colHtml)}
        {composing?.kind === "col" ? (
          <div className="new-col open">{composer("col", "", "Column name")}</div>
        ) : (
          <button className="new-col" onClick={() => openComposer("col", "")}>
            + Add column
          </button>
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
