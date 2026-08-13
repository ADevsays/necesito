import express from "express";
import { join } from "node:path";
import { env } from "./config/env.js";
import { bootstrapDatabase } from "./db/bootstrap.js";
import { getLocalClient, getRemoteTursoClient } from "./db/client.js";
import { createRoutes } from "./routes.js";

const app = express();
let client = getRemoteTursoClient();
try {
  await bootstrapDatabase(client);
  console.log("Using Turso database");
} catch (e) {
  console.warn("Remote Turso unavailable, falling back to local dev database.");
  console.error(e);
  client = getLocalClient();
  await bootstrapDatabase(client);
}

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static("public", { extensions: ["html"] }));
app.use(createRoutes());

app.get("/coordinar", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "coordinar.html"));
});

app.get("/", (_req, res) => {
  res.sendFile(join(process.cwd(), "public", "index.html"));
});

app.listen(env.port, () => {
  console.log(`NECESITO running on http://localhost:${env.port}`);
});
