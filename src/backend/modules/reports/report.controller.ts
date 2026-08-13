import type { Request, Response } from "express";
import { env } from "../../config/env.js";
import { getReportHistory, listReports, syncReports, updateReportStatus, updateReportLocation, flagReport } from "./report.service.js";

function authOk(req: Request) {
  if (!env.coordinatorToken) return true;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  return token === env.coordinatorToken;
}

function sanitizeText(value: unknown, maxLength = 80) {
  if (typeof value !== "string") return "";
  return value.replace(/[<>]/g, "").trim().slice(0, maxLength);
}

export async function flagReportHandler(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  
  const flaggedBy = sanitizeText(req.body?.flagged_by, 80);
  const reason = sanitizeText(req.body?.reason, 80) || "user_report";
  
  if (!flaggedBy) {
    res.status(400).json({ error: "missing_volunteer_id" });
    return;
  }
  
  try {
    const result = await flagReport(id, flaggedBy, reason);
    res.json(result);
  } catch (error) {
    if (error instanceof Error && error.message === "not_found") {
      res.status(404).json({ error: "not_found" });
      return;
    }
    if (error instanceof Error && error.message === "already_flagged") {
      res.status(409).json({ error: "already_flagged" });
      return;
    }
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  }
}

export async function syncReportsHandler(req: Request, res: Response) {
  const reports = Array.isArray(req.body?.reports) ? req.body.reports : [];
  const result = await syncReports(reports);
  res.json(result);
}

export async function getReportsHandler(req: Request, res: Response) {
  const filters: Parameters<typeof listReports>[0] = {};
  if (typeof req.query.region === "string") filters.region = req.query.region;
  if (typeof req.query.municipality === "string") filters.municipality = req.query.municipality;
  if (typeof req.query.need === "string") filters.need = req.query.need;
  if (typeof req.query.priority === "string") filters.priority = req.query.priority;
  if (typeof req.query.status === "string") filters.status = req.query.status;
  if (typeof req.query.created_after === "string") filters.created_after = req.query.created_after;
  const reports = await listReports(filters);
  res.json({ reports });
}

export async function patchReportStatusHandler(req: Request, res: Response) {
  if (!authOk(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }

  const status = sanitizeText(req.body?.status, 20);
  const assignedTo = sanitizeText(req.body?.assigned_to, 80) || null;
  const changedBy = sanitizeText(req.body?.changed_by, 80) || "coordinator";

  try {
    const report = await updateReportStatus(id, status, changedBy, assignedTo);
    if (!report) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ report });
  } catch (error) {
    if (error instanceof Error && error.message === "invalid_status") {
      res.status(400).json({ error: "invalid_status" });
      return;
    }
    res.status(500).json({ error: "internal_error" });
  }
}

export async function patchReportLocationHandler(req: Request, res: Response) {
  if (!authOk(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const locationLabel = sanitizeText(req.body?.location_label, 200);
  if (!locationLabel) {
    res.status(400).json({ error: "invalid_location" });
    return;
  }

  try {
    const report = await updateReportLocation(id, locationLabel);
    if (!report) {
      res.status(404).json({ error: "not_found" });
      return;
    }
    res.json({ report });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "internal_error" });
  }
}

export async function getReportHistoryHandler(req: Request, res: Response) {
  if (!authOk(req)) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) {
    res.status(400).json({ error: "invalid_id" });
    return;
  }
  const history = await getReportHistory(id);
  res.json({ history });
}
