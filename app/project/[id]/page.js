import { notFound } from "next/navigation";
import { db, projectKey } from "@/lib/redis";
import Board from "@/components/Board";

export const instant = false;

export default async function ProjectPage({ params }) {
  const { id } = await params;
  const project = await db().get(projectKey(id));
  if (!project) notFound();
  return <Board project={project} />;
}
