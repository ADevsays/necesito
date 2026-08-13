import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { randomUUID } from "node:crypto";

const PORT = process.env.PORT || 3000;
const ROOT = process.cwd();
const PUBLIC_DIR = join(ROOT, "public");
const DATA_DIR = join(ROOT, "data");
const STORE_PATH = join(DATA_DIR, "store.json");
const COORDINATOR_TOKEN = process.env.COORDINATOR_TOKEN || "";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".ico": "image/x-icon",
};

const DEFAULT_STORE = {
  volunteers: [],
  reports: [],
  report_status_history: [],
  sync_events: [],
};

let storeQueue = Promise.resolve();

async function ensureStore() {
  await mkdir(DATA_DIR, { recursive: true });
  if (!existsSync(STORE_PATH)) {
    await writeFile(STORE_PATH, JSON.stringify(DEFAULT_STORE, null, 2), "utf8");
  }
}

async function readStore() {
  await ensureStore();
  const raw = await readFile(STORE_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_STORE,
      ...parsed,
      volunteers: Array.isArray(parsed.volunteers) ? parsed.volunteers : [],
      reports: Array.isArray(parsed.reports) ? parsed.reports : [],
      report_status_history: Array.isArray(parsed.report_status_history) ? parsed.report_status_history : [],
      sync_events: Array.isArray(parsed.sync_events) ? parsed.sync_events : [],
    };
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
}

async function writeStore(store) {
  await ensureStore();
  await writeFile(STORE_PATH, JSON.stringify(store, null, 2), "utf8");
}

function withStore(task) {
  const run = storeQueue.then(async () => {
    const store = await readStore();
    const result = await task(store);
    await writeStore(store);
    return result;
  });
  storeQueue = run.catch(() => {});
  return run;
}

function sendJson(res, statusCode, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function sendText(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function getRequestUrl(req) {
  return new URL(req.url, `http://${req.headers.host || "localhost"}`);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => {
      chunks.push(chunk);
      if (Buffer.concat(chunks).length > 1024 * 1024 * 8) {
        reject(new Error("Payload too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function isSafeToken(token) {
  return typeof token === "string" && token.length > 0;
}

function authOk(req) {
  if (!isSafeToken(COORDINATOR_TOKEN)) return true;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === COORDINATOR_TOKEN;
}

function sanitizeText(value, maxLength = 280) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function normalizeLocation(location = {}) {
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const accuracy = Number(location.accuracy);
  return {
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    label: sanitizeText(location.label || "", 120),
    address: sanitizeText(location.address || "", 180),
    region: sanitizeText(location.region || "", 60),
    municipality: sanitizeText(location.municipality || "", 80),
    neighborhood: sanitizeText(location.neighborhood || "", 80),
  };
}

function normalizePhotos(photos = []) {
  if (!Array.isArray(photos)) return [];
  return photos.slice(0, 2).map((photo) => ({
    name: sanitizeText(photo?.name || "photo", 80),
    type: sanitizeText(photo?.type || "image/jpeg", 40),
    dataUrl: typeof photo?.dataUrl === "string" ? photo.dataUrl : "",
    size: Number.isFinite(Number(photo?.size)) ? Number(photo.size) : null,
  }));
}

function reportFromPayload(payload) {
  const localId = sanitizeText(payload.local_id || "", 80);
  const volunteerId = sanitizeText(payload.volunteer_id || "", 80);
  const needs = Array.isArray(payload.needs)
    ? [...new Set(payload.needs.map((need) => sanitizeText(need, 40)).filter(Boolean))].slice(0, 10)
    : [];
  const createdAt = sanitizeText(payload.created_at || new Date().toISOString(), 40);
  const updatedAt = sanitizeText(payload.updated_at || createdAt, 40);
  return {
    local_id: localId || randomUUID(),
    server_id: sanitizeText(payload.server_id || "", 80) || null,
    volunteer_id: volunteerId || null,
    volunteer_name: sanitizeText(payload.volunteer_name || "", 80),
    phone: sanitizeText(payload.phone || "", 40),
    created_at: createdAt,
    updated_at: updatedAt,
    sync_status: ["pending", "syncing", "synced", "failed"].includes(payload.sync_status) ? payload.sync_status : "pending",
    sync_attempts: Number.isFinite(Number(payload.sync_attempts)) ? Number(payload.sync_attempts) : 0,
    last_sync_attempt: sanitizeText(payload.last_sync_attempt || "", 40) || null,
    status: ["new", "assigned", "in_progress", "resolved", "invalid"].includes(payload.status) ? payload.status : "new",
    status_changed_at: sanitizeText(payload.status_changed_at || createdAt, 40),
    region: sanitizeText(payload.region || payload.location?.region || "", 60),
    municipality: sanitizeText(payload.municipality || payload.location?.municipality || "", 80),
    neighborhood: sanitizeText(payload.neighborhood || payload.location?.neighborhood || "", 80),
    location: normalizeLocation(payload.location),
    needs,
    priority: ["critical", "urgent", "necessary"].includes(payload.priority) ? payload.priority : "necessary",
    people_count: sanitizeText(payload.people_count || "1", 8),
    injured: Boolean(payload.injured),
    trapped: Boolean(payload.trapped),
    children: Boolean(payload.children),
    elderly: Boolean(payload.elderly),
    description: sanitizeText(payload.description || "", 280),
    emergency: Boolean(payload.emergency),
    photos: normalizePhotos(payload.photos),
    assigned_to: sanitizeText(payload.assigned_to || "", 80) || null,
    source: sanitizeText(payload.source || "offline", 20),
  };
}

function mergeReport(existing, incoming) {
  return {
    ...existing,
    ...incoming,
    server_id: existing.server_id || incoming.server_id || `report_${randomUUID().slice(0, 8)}`,
    updated_at: new Date().toISOString(),
    sync_status: "synced",
    last_sync_attempt: new Date().toISOString(),
  };
}

function reportKey(report) {
  return `${report.priority}:${report.created_at}:${report.local_id}`;
}

function matchesFilters(report, query) {
  const region = sanitizeText(query.get("region") || "", 60).toLowerCase();
  const municipality = sanitizeText(query.get("municipality") || "", 80).toLowerCase();
  const need = sanitizeText(query.get("need") || "", 40).toLowerCase();
  const priority = sanitizeText(query.get("priority") || "", 20).toLowerCase();
  const status = sanitizeText(query.get("status") || "", 20).toLowerCase();
  const createdAfter = sanitizeText(query.get("created_after") || "", 40);
  if (region && (report.region || "").toLowerCase() !== region) return false;
  if (municipality && (report.municipality || "").toLowerCase() !== municipality) return false;
  if (need && !report.needs.map((item) => item.toLowerCase()).includes(need)) return false;
  if (priority && report.priority !== priority) return false;
  if (status && report.status !== status) return false;
  if (createdAfter && new Date(report.created_at) <= new Date(createdAfter)) return false;
  return true;
}

async function handleApiSync(req, res) {
  const body = await readBody(req);
  const incoming = Array.isArray(body.reports) ? body.reports : [];
  const now = new Date().toISOString();
  const synced = [];
  const failed = [];

  await withStore(async (store) => {
    for (const raw of incoming) {
      const report = reportFromPayload(raw);
      if (!report.local_id || !report.volunteer_id) {
        failed.push({ local_id: report.local_id || null, reason: "missing_required_fields" });
        continue;
      }

      const existingIndex = store.reports.findIndex((item) => item.local_id === report.local_id);
      if (existingIndex >= 0) {
        const existing = store.reports[existingIndex];
        const merged = mergeReport(existing, report);
        store.reports[existingIndex] = merged;
        synced.push({ local_id: report.local_id, server_id: merged.server_id });
        store.sync_events.push({
          event_id: `sync_${randomUUID().slice(0, 8)}`,
          local_id: report.local_id,
          server_id: merged.server_id,
          outcome: "duplicate_accepted",
          created_at: now,
        });
        continue;
      }

      const serverId = `report_${randomUUID().slice(0, 8)}`;
      const syncedReport = {
        ...report,
        server_id: serverId,
        sync_status: "synced",
        last_sync_attempt: now,
      };
      store.reports.push(syncedReport);
      store.report_status_history.push({
        history_id: `hist_${randomUUID().slice(0, 8)}`,
        report_id: serverId,
        previous_status: null,
        next_status: syncedReport.status,
        changed_by: syncedReport.volunteer_id,
        changed_at: now,
      });
      store.sync_events.push({
        event_id: `sync_${randomUUID().slice(0, 8)}`,
        local_id: report.local_id,
        server_id: serverId,
        outcome: "created",
        created_at: now,
      });
      synced.push({ local_id: report.local_id, server_id: serverId });
    }
  });

  sendJson(res, 200, { synced, failed });
}

async function handleApiReports(req, res, query) {
  const store = await readStore();
  const items = store.reports
    .filter((report) => matchesFilters(report, query))
    .sort((a, b) => reportKey(a).localeCompare(reportKey(b)));
  sendJson(res, 200, { reports: items });
}

async function handlePatchStatus(req, res, id) {
  if (!authOk(req)) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }
  const body = await readBody(req);
  const nextStatus = sanitizeText(body.status || "", 20);
  const changedBy = sanitizeText(body.changed_by || "coordinator", 80);
  const assignedTo = sanitizeText(body.assigned_to || "", 80);
  if (!["new", "assigned", "in_progress", "resolved", "invalid"].includes(nextStatus)) {
    sendJson(res, 400, { error: "invalid_status" });
    return;
  }

  const now = new Date().toISOString();
  const result = await withStore(async (store) => {
    const index = store.reports.findIndex((report) => report.server_id === id);
    if (index < 0) return null;
    const current = store.reports[index];
    const updated = {
      ...current,
      status: nextStatus,
      assigned_to: assignedTo || current.assigned_to,
      updated_at: now,
    };
    store.reports[index] = updated;
    store.report_status_history.push({
      history_id: `hist_${randomUUID().slice(0, 8)}`,
      report_id: id,
      previous_status: current.status,
      next_status: nextStatus,
      changed_by: changedBy,
      changed_at: now,
    });
    return updated;
  });

  if (!result) {
    sendJson(res, 404, { error: "not_found" });
    return;
  }

  sendJson(res, 200, { report: result });
}

async function handleReportHistory(req, res, id) {
  if (!authOk(req)) {
    sendJson(res, 401, { error: "unauthorized" });
    return;
  }
  const store = await readStore();
  const history = store.report_status_history.filter((item) => item.report_id === id);
  sendJson(res, 200, { history });
}

async function serveFile(res, filePath) {
  try {
    const data = await readFile(filePath);
    const type = MIME_TYPES[extname(filePath)] || "application/octet-stream";
    res.writeHead(200, {
      "Content-Type": type,
      "Cache-Control": "no-store",
      "Content-Length": data.length,
    });
    res.end(data);
  } catch {
    sendText(res, 404, "Not found");
  }
}

function resolvePublicPath(urlPath) {
  const safePath = normalize(urlPath).replace(/^(\.\.[/\\])+/, "");
  return join(PUBLIC_DIR, safePath);
}

const server = createServer(async (req, res) => {
  try {
    const url = getRequestUrl(req);
    const pathname = url.pathname;

    if (req.method === "GET" && pathname === "/api/health") {
      sendJson(res, 200, { ok: true, time: new Date().toISOString() });
      return;
    }

    if (req.method === "POST" && pathname === "/api/reports/sync") {
      await handleApiSync(req, res);
      return;
    }

    if (req.method === "GET" && pathname === "/api/reports") {
      await handleApiReports(req, res, url.searchParams);
      return;
    }

    if (req.method === "PATCH" && pathname.startsWith("/api/reports/") && pathname.endsWith("/status")) {
      const id = pathname.split("/")[3];
      await handlePatchStatus(req, res, id);
      return;
    }

    if (req.method === "GET" && pathname.startsWith("/api/reports/") && pathname.endsWith("/history")) {
      const id = pathname.split("/")[3];
      await handleReportHistory(req, res, id);
      return;
    }

    if (req.method === "GET" && pathname === "/coordinar") {
      await serveFile(res, join(PUBLIC_DIR, "coordinar.html"));
      return;
    }

    if (req.method === "GET" && pathname === "/") {
      await serveFile(res, join(PUBLIC_DIR, "index.html"));
      return;
    }

    if (req.method === "GET") {
      const filePath = resolvePublicPath(pathname);
      if (filePath.startsWith(PUBLIC_DIR) && existsSync(filePath)) {
        await serveFile(res, filePath);
        return;
      }
    }

    sendText(res, 404, "Not found");
  } catch (error) {
    sendJson(res, 500, { error: "internal_error", message: error.message });
  }
});

await ensureStore();
server.listen(PORT, () => {
  console.log(`NECESITO listening on http://localhost:${PORT}`);
});
