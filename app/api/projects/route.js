import { db, PROJECTS_SET, projectKey } from "@/lib/redis";

function todoCount(columns = []) {
  return columns.reduce(
    (n, c) =>
      n + (c.groups || []).reduce((m, g) => m + (g.items || []).length, 0),
    0
  );
}

export async function GET() {
  const ids = await db().smembers(PROJECTS_SET);
  const raw = await Promise.all(ids.map((id) => db().get(projectKey(id))));
  const projects = raw
    .filter(Boolean)
    .map((p) => ({
      id: p.id,
      name: p.name,
      createdAt: p.createdAt,
      columns: p.board?.columns?.length || 0,
      todos: todoCount(p.board?.columns),
    }))
    .sort((a, b) => b.createdAt - a.createdAt);
  return Response.json(projects);
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  if (!name) return Response.json({ error: "Name required" }, { status: 400 });

  const project = {
    id: Math.random().toString(36).slice(2, 10),
    name,
    createdAt: Date.now(),
    board: { columns: [] },
  };
  await db().sadd(PROJECTS_SET, project.id);
  await db().set(projectKey(project.id), project);
  return Response.json(project, { status: 201 });
}
