import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ReportHistoryModel, ReportModel, SyncEventModel } from "./report.model.js";
import { VolunteerModel } from "../volunteers/volunteer.model.js";
import { LocationModel } from "../locations/location.model.js";
import { ReportNeedsModel } from "./needs.model.js";
import { ReportPhotoModel } from "./photo.model.js";
import { notifyUrgentReport, notifyNewDonation } from "../push/push.service.js";
import type { LocationRecord, ReportHistoryRecord, ReportPhotoRecord, ReportRecord, ReportSyncInput } from "./report.types.js";
import type { VolunteerRecord } from "../volunteers/volunteer.types.js";

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

function processPhotoBase64(dataUrl: string | undefined, localId: string, index: number): string {
  if (!dataUrl || !dataUrl.startsWith("data:image")) return dataUrl || "";
  
  try {
    const matches = dataUrl.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return dataUrl;
    
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const base64Data = matches[2] as string;
    const buffer = Buffer.from(base64Data, 'base64');
    
    const filename = `report_${localId.slice(0,8)}_${index}_${randomUUID().slice(0,6)}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, buffer);
    
    return `/uploads/${filename}`;
  } catch(e) {
    console.error("Error saving image:", e);
    return dataUrl; 
  }
}

export async function syncReports(payloads: ReportSyncInput[]) {
  const synced: Array<{ local_id: string; server_id: string }> = [];
  const failed: Array<{ local_id: string; reason: string }> = [];
  const now = new Date().toISOString();

  for (const payload of payloads) {
    const localId = cleanText(payload.local_id, 80) || randomUUID();
    const volunteerId = cleanText(payload.volunteer_id, 80);
    const volunteerName = cleanText(payload.volunteer_name || "", 80);
    const phone = cleanText(payload.phone || "", 30);

    if (!volunteerId) {
      failed.push({ local_id: localId, reason: "missing_volunteer" });
      continue;
    }

    // 1. Ensure volunteer exists in volunteers table
    try {
      const existingVol = await VolunteerModel.findOne<VolunteerRecord>({ where: { volunteer_id: volunteerId } });
      if (!existingVol) {
        await VolunteerModel.create({
          volunteer_id: volunteerId,
          name: volunteerName || "Voluntario",
          phone: phone || null,
          created_at: now,
          updated_at: now,
        });
      } else if (volunteerName && (!existingVol.name || existingVol.name === "Voluntario" || (phone && existingVol.phone !== phone))) {
        await VolunteerModel.update(existingVol.id, {
          name: volunteerName,
          phone: phone || existingVol.phone,
          updated_at: now,
        });
      }
    } catch (e) {
      console.warn("Volunteer ensure notice:", e);
    }

    // 2. Handle location normalization
    let locationId: number | null = null;
    const loc = payload.location;
    const lat = toNumber(loc?.lat);
    const lng = toNumber(loc?.lng);
    const accuracy = toNumber(loc?.accuracy);
    const label = cleanText(loc?.label || payload.region || "", 120);
    const address = cleanText(loc?.address || "", 180);
    const region = cleanText(loc?.region || payload.region || "", 60);
    const municipality = cleanText(loc?.municipality || payload.municipality || "", 80);
    const neighborhood = cleanText(loc?.neighborhood || payload.neighborhood || "", 80);

    if (lat !== null || lng !== null || label || address || region || municipality) {
      try {
        const createdLoc = (await LocationModel.create({
          latitude: lat,
          longitude: lng,
          accuracy,
          label,
          address,
          region,
          municipality,
          neighborhood,
          created_at: now,
        })) as LocationRecord & { id: number };
        locationId = Number(createdLoc.id);
      } catch (e) {
        console.warn("Location creation notice:", e);
      }
    }

    // 3. Normalize Report Data
    const reportData = {
      local_id: localId,
      volunteer_id: volunteerId,
      location_id: locationId,
      priority: ["critical", "urgent", "necessary"].includes(payload.priority || "") ? payload.priority! : "necessary",
      people_count: Math.max(1, Math.min(10, Number(String(payload.people_count ?? 1).replace("+", "")) || 1)),
      injured: toBooleanNullable(payload.injured),
      trapped: toBooleanNullable(payload.trapped),
      children: toBooleanNullable(payload.children),
      elderly: toBooleanNullable(payload.elderly),
      description: cleanText(payload.description || "", 280),
      emergency: payload.emergency ? 1 : 0,
      assigned_to: cleanText(payload.assigned_to || "", 80) || null,
      source: cleanText(payload.source || "offline", 20),
      status: ["new", "assigned", "in_progress", "resolved", "invalid", "flagged"].includes(payload.status || "") ? payload.status! : "new",
      status_changed_at: cleanText(payload.status_changed_at || payload.created_at || now, 40),
      sync_status: "synced" as const,
      sync_attempts: Number.isFinite(Number(payload.sync_attempts)) ? Number(payload.sync_attempts) : 0,
      last_sync_attempt: now,
      created_at: cleanText(payload.created_at || now, 40),
      updated_at: now,
    };

    const needs = Array.isArray(payload.needs)
      ? [...new Set(payload.needs.map((item) => cleanText(item, 40)).filter(Boolean))].slice(0, 10)
      : [];

    const photos = Array.isArray(payload.photos)
      ? payload.photos.slice(0, 2).map((photo, index) => ({
          name: cleanText(photo?.name || "photo", 80),
          type: cleanText(photo?.type || "image/jpeg", 40),
          dataUrl: processPhotoBase64(photo?.dataUrl, localId, index),
          size: toNumber(photo?.size),
        }))
      : [];

    // Check if report already exists
    const existing = await ReportModel.findOne<ReportRecord>({ where: { local_id: localId } });
    let reportId: number;
    let serverId: string;

    if (existing) {
      reportId = existing.id;
      serverId = existing.server_id || `report_${randomUUID().slice(0, 8)}`;
      await ReportModel.update<ReportRecord>(existing.id, {
        ...reportData,
        server_id: serverId,
        location_id: locationId ?? existing.location_id,
      });

      // Update needs: delete and re-insert
      try {
        await ReportNeedsModel.execute(`DELETE FROM report_needs WHERE report_id = ?`, [reportId]);
        for (const needCode of needs) {
          await ReportNeedsModel.create({ report_id: reportId, need_code: needCode });
        }
      } catch (e) {
        console.warn("Needs update notice:", e);
      }

      // Update photos: delete and re-insert if new photos supplied
      if (photos.length > 0) {
        try {
          await ReportPhotoModel.execute(`DELETE FROM report_photos WHERE report_id = ?`, [reportId]);
          for (const photo of photos) {
            await ReportPhotoModel.create({
              report_id: reportId,
              data_url: photo.dataUrl,
              name: photo.name,
              mime_type: photo.type,
              size: photo.size,
              created_at: now,
            });
          }
        } catch (e) {
          console.warn("Photos update notice:", e);
        }
      }

      try {
        await SyncEventModel.create({
          local_id: localId,
          report_id: reportId,
          outcome: "duplicate_accepted",
          created_at: now,
          payload_json: toJson(payload),
        });
      } catch (e) {
        console.warn("SyncEvent duplicate logging notice:", e);
      }

      synced.push({ local_id: localId, server_id: serverId });
      continue;
    }

    // Create New Report
    serverId = `report_${randomUUID().slice(0, 8)}`;
    let createdReport: (ReportRecord & { id: number }) | null = null;

    try {
      createdReport = (await ReportModel.create({
        ...reportData,
        server_id: serverId,
      })) as ReportRecord & { id: number };
      reportId = Number(createdReport.id);
    } catch (createErr: any) {
      const isConstraint = createErr?.code === 'SQLITE_CONSTRAINT' || String(createErr?.message || '').includes('UNIQUE constraint');
      if (isConstraint) {
        const raceExisting = await ReportModel.findOne<ReportRecord>({ where: { local_id: localId } });
        if (raceExisting) {
          reportId = raceExisting.id;
          serverId = raceExisting.server_id || serverId;
          await ReportModel.update<ReportRecord>(raceExisting.id, {
            ...reportData,
            server_id: serverId,
          });
          synced.push({ local_id: localId, server_id: serverId });
          continue;
        }
      }
      failed.push({ local_id: localId, reason: createErr?.message || "db_insert_failed" });
      continue;
    }

    // Insert normalized needs
    try {
      for (const needCode of needs) {
        await ReportNeedsModel.create({ report_id: reportId, need_code: needCode });
      }
    } catch (e) {
      console.warn("Report needs insert notice:", e);
    }

    // Insert normalized photos
    try {
      for (const photo of photos) {
        await ReportPhotoModel.create({
          report_id: reportId,
          data_url: photo.dataUrl,
          name: photo.name,
          mime_type: photo.type,
          size: photo.size,
          created_at: now,
        });
      }
    } catch (e) {
      console.warn("Report photos insert notice:", e);
    }

    // Insert Status History
    await ReportHistoryModel.create({
      report_id: reportId,
      previous_status: null,
      next_status: reportData.status,
      changed_by: volunteerId,
      changed_at: now,
      note: null,
    });

    // Insert Sync Event
    try {
      await SyncEventModel.create({
        local_id: localId,
        report_id: reportId,
        outcome: "created",
        created_at: now,
        payload_json: toJson(payload),
      });
    } catch (e) {
      console.warn("SyncEvent creation notice:", e);
    }

    // Trigger push notification
    if (createdReport) {
      const pushPayload = {
        priority: reportData.priority,
        municipality: municipality || label || null,
        description: reportData.description,
      };
      if (reportData.source === 'donation') {
        notifyNewDonation(pushPayload).catch(err => console.error("Push error:", err));
      } else {
        notifyUrgentReport(pushPayload).catch(err => console.error("Push error:", err));
      }
    }

    synced.push({ local_id: localId, server_id: serverId });
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
  const [reports, volunteers, locations, allNeeds, allPhotos] = await Promise.all([
    ReportModel.findAll<ReportRecord>(),
    VolunteerModel.findAll<VolunteerRecord>(),
    LocationModel.findAll<LocationRecord>(),
    ReportNeedsModel.findAll<{ id: number; report_id: number; need_code: string }>(),
    ReportPhotoModel.findAll<ReportPhotoRecord>(),
  ]);

  const volunteerMap = new Map<string, VolunteerRecord>();
  volunteers.forEach(v => volunteerMap.set(v.volunteer_id, v));

  const locationMap = new Map<number, LocationRecord>();
  locations.forEach(l => locationMap.set(l.id, l));

  const needsMap = new Map<number, string[]>();
  allNeeds.forEach(n => {
    if (!needsMap.has(n.report_id)) needsMap.set(n.report_id, []);
    needsMap.get(n.report_id)!.push(n.need_code);
  });

  const photosMap = new Map<number, Array<{ name?: string; type?: string; dataUrl?: string; size?: number }>>();
  allPhotos.forEach(p => {
    if (!photosMap.has(p.report_id)) photosMap.set(p.report_id, []);
    photosMap.get(p.report_id)!.push({
      name: p.name || "",
      type: p.mime_type || "image/jpeg",
      dataUrl: p.data_url,
      size: p.size || 0,
    });
  });

  const normalizedNeed = cleanText(filters.need || "", 40).toLowerCase();
  const normalizedRegion = cleanText(filters.region || "", 60).toLowerCase();
  const normalizedMunicipality = cleanText(filters.municipality || "", 80).toLowerCase();
  const normalizedPriority = cleanText(filters.priority || "", 20).toLowerCase();
  const normalizedStatus = cleanText(filters.status || "", 20).toLowerCase();
  const createdAfter = filters.created_after ? new Date(filters.created_after) : null;

  return reports
    .map(report => {
      const vol = volunteerMap.get(report.volunteer_id);
      const loc = report.location_id ? locationMap.get(report.location_id) : null;
      const needs = needsMap.get(report.id) || [];
      const photos = photosMap.get(report.id) || [];

      return {
        ...report,
        volunteer_name: vol?.name || "Anónimo",
        phone: vol?.phone || "",
        needs,
        photos,
        location: {
          lat: loc?.latitude ?? null,
          lng: loc?.longitude ?? null,
          accuracy: loc?.accuracy ?? null,
          label: loc?.label ?? "",
          address: loc?.address ?? "",
          region: loc?.region ?? "",
          municipality: loc?.municipality ?? "",
          neighborhood: loc?.neighborhood ?? "",
        },
        latitude: loc?.latitude ?? null,
        longitude: loc?.longitude ?? null,
        accuracy: loc?.accuracy ?? null,
        location_label: loc?.label ?? "",
        location_address: loc?.address ?? "",
        region: loc?.region ?? "",
        municipality: loc?.municipality ?? "",
        neighborhood: loc?.neighborhood ?? "",
        injured: report.injured === null ? null : Boolean(report.injured),
        trapped: report.trapped === null ? null : Boolean(report.trapped),
        children: report.children === null ? null : Boolean(report.children),
        elderly: report.elderly === null ? null : Boolean(report.elderly),
      };
    })
    .filter(report => {
      if (normalizedRegion && (report.region || "").toLowerCase() !== normalizedRegion) return false;
      if (normalizedMunicipality && (report.municipality || "").toLowerCase() !== normalizedMunicipality) return false;
      if (normalizedNeed && !(report.needs as string[]).map(item => item.toLowerCase()).includes(normalizedNeed)) return false;
      if (normalizedPriority && report.priority !== normalizedPriority) return false;
      
      const actualStatus = (report.status || "new").toLowerCase();
      
      if (normalizedStatus === "all") {
        if (actualStatus === "flagged") return false;
      } else if (!normalizedStatus || normalizedStatus === "all_active") {
        if (actualStatus === "flagged" || actualStatus === "invalid") return false;
      } else if (actualStatus !== normalizedStatus) {
        return false;
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

  const existingFlags = await ReportFlagModel.findAll();
  const alreadyFlagged = existingFlags.some(
    (f: any) => f.report_id === reportId && f.flagged_by === flaggedBy
  );

  if (alreadyFlagged) {
    throw new Error("already_flagged");
  }

  await ReportFlagModel.create({
    report_id: reportId,
    flagged_by: cleanText(flaggedBy, 80),
    reason: cleanText(reason, 80),
    created_at: new Date().toISOString(),
  });

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
  if (current.location_id) {
    await LocationModel.update(current.location_id, {
      label: locationLabel,
    });
  } else {
    const newLoc = (await LocationModel.create({
      label: locationLabel,
      created_at: now,
    })) as LocationRecord & { id: number };
    await ReportModel.update(id, { location_id: Number(newLoc.id), updated_at: now });
  }

  return await ReportModel.findOne<ReportRecord>({ where: { id } });
}

export async function getReportHistory(id: number) {
  return ReportHistoryModel.findAll<ReportHistoryRecord>().then((history) =>
    history.filter((entry) => entry.report_id === id)
  );
}
