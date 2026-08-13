import { createClient, type Client } from "@libsql/client";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { env } from "../config/env.js";

let client: Client | null = null;

export function getRemoteTursoClient() {
  if (client) return client;
  if (!env.tursoDatabaseUrl || !env.tursoAuthToken) {
    throw new Error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN");
  }
  client = createClient({
    url: env.tursoDatabaseUrl,
    authToken: env.tursoAuthToken,
  });
  return client;
}

export function getLocalClient() {
  const localFile = join(process.cwd(), "data", "necesito-local.db");
  mkdirSync(dirname(localFile), { recursive: true });
  client = createClient({
    url: `file:${localFile}`,
  });
  return client;
}
