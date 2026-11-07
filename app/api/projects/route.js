import { db, PROJECTS_SET, projectKey } from "@/lib/redis";

function countTodos(columns = []) {
  let total = 0;
  let done = 0;
  for (const c of columns) {
    for (const g of c.groups || []) {
      for (const i of g.items || []) {
        total += 1;
        if (i.done) done += 1;
      }
    }
  }
  return { total, done };
}

export async function GET() {
  const ids = await db().smembers(PROJECTS_SET);
  const raw = await Promise.all(ids.map((id) => db().get(projectKey(id))));
  const projects = raw
    .filter(Boolean)
    .map((p) => {
      const { total, done } = countTodos(p.board?.columns);
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt || p.createdAt,
        columns: p.board?.columns?.length || 0,
        todos: total,
        done,
      };
    })
    .sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
  return Response.json(projects);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const now = Date.now();
  const project = {
    id: Math.random().toString(36).slice(2, 10),
    name,
    createdAt: now,
    updatedAt: now,
    board: { columns: [] },
  };
  await db().sadd(PROJECTS_SET, project.id);
  await db().set(projectKey(project.id), project);
  return Response.json(project, { status: 201 });
}
