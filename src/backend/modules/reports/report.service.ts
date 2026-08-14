import { randomUUID } from "node:crypto";
import { ReportHistoryModel, ReportModel, SyncEventModel } from "./report.model.js";
import { notifyUrgentReport } from "../push/push.service.js";
import type { ReportHistoryRecord, ReportRecord, ReportSyncInput } from "./report.types.js";

function cleanText(value: unknown, maxLength = 280) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function toNumber(value: unknown) {
  const num = typeof value === "string" ? Number(value) : Number(value);
  return Number.isFinite(num) ? num : null;
}

function toBooleanNullable(value: unknown) {
  if (value === null || value === undefined) return null;
  return value ? 1 : 0;
}

function toJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

function reportRowToDomain(report: ReportRecord) {
  return {
    ...report,
    needs: JSON.parse(report.needs_json) as string[],
    photos: JSON.parse(report.photos_json) as Array<{ name?: string; type?: string; dataUrl?: string; size?: number }>,
    location: {
      lat: report.latitude,
      lng: report.longitude,
      accuracy: report.accuracy,
      label: report.location_label,
      address: report.location_address,
      region: report.region,
      municipality: report.municipality,
      neighborhood: report.neighborhood,
    },
    injured: report.injured === null ? null : Boolean(report.injured),
    trapped: report.trapped === null ? null : Boolean(report.trapped),
    children: report.children === null ? null : Boolean(report.children),
    elderly: report.elderly === null ? null : Boolean(report.elderly),
  };
}

function normalizeReportPayload(payload: ReportSyncInput) {
  const location = payload.location ?? null;
  const needs = Array.isArray(payload.needs)
    ? [...new Set(payload.needs.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 10)
    : [];
  const photos = Array.isArray(payload.photos)
    ? payload.photos.slice(0, 2).map((photo) => ({
        name: cleanText(photo?.name || "photo", 80),
        type: cleanText(photo?.type || "image/jpeg", 40),
        dataUrl: typeof photo?.dataUrl === "string" ? photo.dataUrl : "",
        size: toNumber(photo?.size),
      }))
    : [];

  return {
    local_id: cleanText(payload.local_id, 80) || randomUUID(),
    volunteer_id: cleanText(payload.volunteer_id, 80),
    volunteer_name: cleanText(payload.volunteer_name || "", 80),
    phone: cleanText(payload.phone || "", 30),
    created_at: cleanText(payload.created_at || new Date().toISOString(), 40),
    updated_at: cleanText(payload.updated_at || new Date().toISOString(), 40),
    sync_status: ["pending", "syncing", "synced", "failed"].includes(payload.sync_status || "") ? payload.sync_status! : "pending",
    sync_attempts: Number.isFinite(Number(payload.sync_attempts)) ? Number(payload.sync_attempts) : 0,
    last_sync_attempt: payload.last_sync_attempt ? cleanText(payload.last_sync_attempt, 40) : null,
    status: ["new", "assigned", "in_progress", "resolved", "invalid", "flagged"].includes(payload.status || "") ? payload.status! : "new",
    status_changed_at: cleanText(payload.status_changed_at || payload.created_at || new Date().toISOString(), 40),
    region: cleanText(payload.region || location?.region || "", 60),
    municipality: cleanText(payload.municipality || location?.municipality || "", 80),
    neighborhood: cleanText(payload.neighborhood || location?.neighborhood || "", 80),
    latitude: toNumber(location?.lat),
    longitude: toNumber(location?.lng),
    accuracy: toNumber(location?.accuracy),
    location_label: cleanText(location?.label || "", 120),
    location_address: cleanText(location?.address || "", 180),
    needs_json: toJson(needs),
    priority: ["critical", "urgent", "necessary"].includes(payload.priority || "") ? payload.priority! : "necessary",
    people_count: Math.max(1, Math.min(10, Number(String(payload.people_count ?? 1).replace("+", "")) || 1)),
    injured: toBooleanNullable(payload.injured),
    trapped: toBooleanNullable(payload.trapped),
    children: toBooleanNullable(payload.children),
    elderly: toBooleanNullable(payload.elderly),
    description: cleanText(payload.description || "", 280),
    emergency: payload.emergency ? 1 : 0,
    photos_json: toJson(photos),
    assigned_to: cleanText(payload.assigned_to || "", 80) || null,
    source: cleanText(payload.source || "offline", 20),
  };
}

export async function syncReports(payloads: ReportSyncInput[]) {
  const synced: Array<{ local_id: string; server_id: string }> = [];
  const failed: Array<{ local_id: string; reason: string }> = [];
  const now = new Date().toISOString();

  for (const payload of payloads) {
    const normalized = normalizeReportPayload(payload);
    if (!normalized.volunteer_id) {
      failed.push({ local_id: normalized.local_id, reason: "missing_volunteer" });
      continue;
    }

    const existing = await ReportModel.findOne<ReportRecord>({ where: { local_id: normalized.local_id } });
    if (existing) {
      const updated = await ReportModel.update<ReportRecord>(existing.id, {
        ...normalized,
        updated_at: now,
        sync_status: "synced",
        last_sync_attempt: now,
        server_id: existing.server_id || `report_${randomUUID().slice(0, 8)}`,
      });
      await SyncEventModel.create({
        local_id: normalized.local_id,
        report_id: existing.id,
        outcome: "duplicate_accepted",
        created_at: now,
        payload_json: toJson(normalized),
      });
      synced.push({ local_id: normalized.local_id, server_id: existing.server_id || `report_${randomUUID().slice(0, 8)}` });
      continue;
    }

    const created = (await ReportModel.create({
      ...normalized,
      server_id: `report_${randomUUID().slice(0, 8)}`,
      sync_status: "synced",
      last_sync_attempt: now,
      updated_at: now,
    })) as ReportRecord & { id: number };

    await ReportHistoryModel.create({
      report_id: Number(created.id),
      previous_status: null,
      next_status: normalized.status,
      changed_by: normalized.volunteer_id,
      changed_at: now,
      note: null,
    });

    await SyncEventModel.create({
      local_id: normalized.local_id,
      report_id: Number(created.id),
      outcome: "created",
      created_at: now,
      payload_json: toJson(normalized),
    });

    notifyUrgentReport(created).catch(err => console.error("Push error:", err));

    synced.push({ local_id: normalized.local_id, server_id: String(created.server_id || `report_${randomUUID().slice(0, 8)}`) });
  }

  return { synced, failed };
}

export async function listReports(filters: {
  region?: string;
  municipality?: string;
  need?: string;
  priority?: string;
  status?: string;
  created_after?: string;
}) {
  const reports = await ReportModel.findAll<ReportRecord>();
  const normalizedNeed = cleanText(filters.need || "", 40).toLowerCase();
  const normalizedRegion = cleanText(filters.region || "", 60).toLowerCase();
  const normalizedMunicipality = cleanText(filters.municipality || "", 80).toLowerCase();
  const normalizedPriority = cleanText(filters.priority || "", 20).toLowerCase();
  const normalizedStatus = cleanText(filters.status || "", 20).toLowerCase();
  const createdAfter = filters.created_after ? new Date(filters.created_after) : null;

  return reports
    .map(reportRowToDomain)
    .filter((report) => {
      if (normalizedRegion && (report.region || "").toLowerCase() !== normalizedRegion) return false;
      if (normalizedMunicipality && (report.municipality || "").toLowerCase() !== normalizedMunicipality) return false;
      if (normalizedNeed && !(report.needs as string[]).map((item) => item.toLowerCase()).includes(normalizedNeed)) return false;
      if (normalizedPriority && report.priority !== normalizedPriority) return false;
      
      const actualStatus = (report.status || "new").toLowerCase();
      
      if (normalizedStatus === "all") {
        if (actualStatus === "flagged") return false;
      } else if (!normalizedStatus) {
        if (actualStatus === "flagged" || actualStatus === "invalid") return false;
      } else {
        if (actualStatus !== normalizedStatus) return false;
      }
      
      if (createdAfter && new Date(report.created_at) <= createdAfter) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function updateReportStatus(id: number, status: string, changedBy: string, assignedTo?: string | null) {
  const current = await ReportModel.findOne<ReportRecord>({ where: { id } });
  if (!current) return null;

  const nextStatus = ["new", "assigned", "in_progress", "resolved", "invalid", "flagged"].includes(status) ? status : null;
  if (!nextStatus) throw new Error("invalid_status");

  const now = new Date().toISOString();
  await ReportModel.update<ReportRecord>(id, {
    status: nextStatus,
    status_changed_at: now,
    updated_at: now,
    assigned_to: assignedTo ?? current.assigned_to,
  });

  await ReportHistoryModel.create({
    report_id: id,
    previous_status: current.status,
    next_status: nextStatus,
    changed_by: cleanText(changedBy || "coordinator", 80),
    changed_at: now,
    note: null,
  });

  return await ReportModel.findOne<ReportRecord>({ where: { id } });
}

export async function flagReport(reportId: number, flaggedBy: string, reason: string) {
  const current = await ReportModel.findOne<ReportRecord>({ where: { id: reportId } });
  if (!current) throw new Error("not_found");

  const { ReportFlagModel } = await import("./flag.model.js");

  // Check if volunteer already flagged this report
  const existingFlags = await ReportFlagModel.findAll();
  const alreadyFlagged = existingFlags.some(
    (f: any) => f.report_id === reportId && f.flagged_by === flaggedBy
  );

  if (alreadyFlagged) {
    throw new Error("already_flagged");
  }

  // Insert flag
  await ReportFlagModel.create({
    report_id: reportId,
    flagged_by: cleanText(flaggedBy, 80),
    reason: cleanText(reason, 80),
    created_at: new Date().toISOString(),
  });

  // Count flags
  const allFlags = await ReportFlagModel.findAll();
  const count = allFlags.filter((f: any) => f.report_id === reportId).length;

  let report = current;
  if (count >= 3 && current.status !== "flagged") {
    const updated = await updateReportStatus(reportId, "flagged", "system");
    if (updated) report = updated;
  }

  return { report, flagCount: count };
}

export async function updateReportLocation(id: number, locationLabel: string) {
  const current = await ReportModel.findOne<ReportRecord>({ where: { id } });
  if (!current) return null;

  const now = new Date().toISOString();
  await ReportModel.update<ReportRecord>(id, {
    location_label: locationLabel,
    updated_at: now,
  });

  return await ReportModel.findOne<ReportRecord>({ where: { id } });
}

export async function getReportHistory(id: number) {
  return ReportHistoryModel.findAll<ReportHistoryRecord>().then((history) =>
    history.filter((entry) => entry.report_id === id)
  );
}
