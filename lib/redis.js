import { Redis } from "@upstash/redis";

let client;

export function db() {
  if (!client) client = Redis.fromEnv();
  return client;
}

export const PROJECTS_SET = "kanban:projects";
export const projectKey = (id) => `kanban:project:${id}`;
