import express from "express";
import { join } from "node:path";
import { env } from "./config/env.js";
import { bootstrapDatabase } from "./db/bootstrap.js";
import { getLocalClient, getRemoteTursoClient } from "./db/client.js";
import { createRoutes } from "./routes.js";
import type { Client } from "@libsql/client";
import { fileURLToPath } from "node:url";

export async function createApp(client: Client) {
  const app = express();
  await bootstrapDatabase(client);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: false, limit: "50mb" }));
  app.use(express.static("public", { extensions: ["html"] }));
  app.use(createRoutes());

  app.get("/coordinar", (_req, res) => {
    res.sendFile(join(process.cwd(), "public", "coordinar.html"));
  });

  app.get("/", (_req, res) => {
    res.sendFile(join(process.cwd(), "public", "index.html"));
  });

  return app;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url).replace(/\\/g, '/') === process.argv[1].replace(/\\/g, '/');

if (isMain || process.env.START_SERVER === 'true') {
  let client: import("@libsql/client").Client;
  try {
    client = getRemoteTursoClient();
    await bootstrapDatabase(client);
    console.log("Using Turso database");
  } catch (e) {
    console.warn("Remote Turso unavailable, falling back to local dev database.");
    client = getLocalClient();
    await bootstrapDatabase(client);
  }

  const app = await createApp(client);

  app.listen(env.port, () => {
    console.log(`NECESITO running on http://localhost:${env.port}`);
  });
}
