import { db, PROJECTS_SET, projectKey } from "@/lib/redis";

export async function GET(request, { params }) {
  const { id } = await params;
  const project = await db().get(projectKey(id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(project);
}

export async function PUT(request, { params }) {
  const { id } = await params;
  const project = await db().get(projectKey(id));
  if (!project) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  if (typeof body.name === "string" && body.name.trim()) {
    project.name = body.name.trim().slice(0, 80);
  }
  if (body.board && Array.isArray(body.board.columns)) {
    project.board = body.board;
  }
  await db().set(projectKey(id), project);
  return Response.json(project);
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  await db().srem(PROJECTS_SET, id);
  await db().del(projectKey(id));
  return Response.json({ ok: true });
}
