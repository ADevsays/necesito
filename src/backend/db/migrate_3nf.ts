import { getLocalClient, getRemoteTursoClient } from "./client.js";
import { bootstrapDatabase } from "./bootstrap.js";
import { VolunteerModel } from "../modules/volunteers/volunteer.model.js";
import { LocationModel } from "../modules/locations/location.model.js";
import { ReportModel, ReportHistoryModel } from "../modules/reports/report.model.js";
import { ReportNeedsModel } from "../modules/reports/needs.model.js";
import { ReportPhotoModel } from "../modules/reports/photo.model.js";
import type { LocationRecord, ReportRecord } from "../modules/reports/report.types.js";

const BASELINE_REAL_REPORTS = [
  {
    local_id: "rep_7e3b9762",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "donation",
    priority: "necessary" as const,
    needs: ["clothes"],
    description: "Donación de ropa en buen estado (abrigos y camisetas)",
    latitude: 3.530412,
    longitude: -76.306332,
    location_label: "Calle 32A, Santa Barbara, Palmira, Valle del Cauca",
    municipality: "Palmira",
    region: "Valle del Cauca",
    status: "new" as const,
    people_count: 1,
    photos: [] as any[],
  },
  {
    local_id: "rep_498625ed",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "donation",
    priority: "necessary" as const,
    needs: ["construction"],
    description: "Guantes de trabajo pesado, palas y botas de caucho",
    latitude: 3.530412,
    longitude: -76.306332,
    location_label: "Calle 32A, Santa Barbara, Palmira, Valle del Cauca",
    municipality: "Palmira",
    region: "Valle del Cauca",
    status: "new" as const,
    people_count: 1,
    photos: [] as any[],
  },
  {
    local_id: "rep_dc15a944",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "donation",
    priority: "necessary" as const,
    needs: ["food"],
    description: "Latas de atún, arroz y agua potable empacada",
    latitude: 3.530430,
    longitude: -76.306500,
    location_label: "Calle 32A, Santa Barbara, Palmira, Valle del Cauca",
    municipality: "Palmira",
    region: "Valle del Cauca",
    status: "new" as const,
    people_count: 1,
    photos: [] as any[],
  },
  {
    local_id: "rep_742e4821",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "offline",
    priority: "urgent" as const,
    needs: ["rescue"],
    description: "Familia requiere apoyo de evacuación por afectación en vivienda",
    latitude: 3.530389,
    longitude: -76.306323,
    location_label: "Calle 32A, Santa Barbara, Palmira, Valle del Cauca",
    municipality: "Palmira",
    region: "Valle del Cauca",
    status: "resolved" as const,
    people_count: 4,
    injured: 0,
    trapped: 0,
    children: 1,
    elderly: 1,
    photos: [] as any[],
  },
  {
    local_id: "rep_9cf38ab1",
    volunteer_id: "vol_gustavo",
    volunteer_name: "Gustavo",
    phone: "3206542836",
    source: "offline",
    priority: "critical" as const,
    needs: ["food", "water", "medication"],
    description: "Comunidad aislada necesita agua potable y medicamentos básicos",
    latitude: 5.06889,
    longitude: -75.51738,
    location_label: "Manizales, Caldas",
    municipality: "Manizales",
    region: "Caldas",
    status: "new" as const,
    people_count: 6,
    injured: 1,
    trapped: 0,
    children: 2,
    elderly: 1,
    photos: [] as any[],
  },
  {
    local_id: "rep_2899b945",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "offline",
    priority: "necessary" as const,
    needs: ["pets"],
    description: "2 perros rescatados requieren alimento y atención veterinaria",
    latitude: 5.0645,
    longitude: -75.4870,
    location_label: "Manizales - Alta Carola, Caldas",
    municipality: "Manizales",
    region: "Caldas",
    status: "in_progress" as const,
    people_count: 2,
    photos: [] as any[],
  },
  {
    local_id: "rep_1bbd9511",
    volunteer_id: "vol_rafael",
    volunteer_name: "Rafael Tobar",
    phone: "3162724069",
    source: "offline",
    priority: "necessary" as const,
    needs: ["pets"],
    description: "Mascota extraviada reportada por vecinos del sector",
    latitude: 5.0332,
    longitude: -75.4521,
    location_label: "Manizales - Barrio La Enea Carrera 32B # 92, Caldas",
    municipality: "Manizales",
    region: "Caldas",
    status: "new" as const,
    people_count: 1,
    photos: [] as any[],
  }
];

async function runMigration() {
  console.log("🚀 Starting 3NF database migration and cleanup...");

  let client: import("@libsql/client").Client;
  try {
    client = getRemoteTursoClient();
    console.log("Connected to Remote Turso database");
  } catch (e) {
    console.log("Using Local SQLite database");
    client = getLocalClient();
  }

  // 1. Drop existing tables to establish clean 3NF schema
  const tables = [
    "report_needs",
    "report_photos",
    "report_status_history",
    "report_flags",
    "sync_events",
    "reports",
    "locations",
    "needs_catalog",
    "volunteers",
    "push_subscriptions"
  ];

  for (const t of tables) {
    try {
      await client.execute(`DROP TABLE IF EXISTS ${t}`);
    } catch (e) {
      console.warn(`Notice dropping ${t}:`, e);
    }
  }

  // 2. Re-create all 3NF tables with bootstrap
  await bootstrapDatabase(client);
  console.log("✨ 3NF Schema created successfully.");

  // 3. Migrate and seed clean baseline reports
  const now = new Date().toISOString();
  const createdVolunteers = new Map<string, string>();

  for (const r of BASELINE_REAL_REPORTS) {
    // 1. Volunteer
    if (!createdVolunteers.has(r.volunteer_id)) {
      await VolunteerModel.create({
        volunteer_id: r.volunteer_id,
        name: r.volunteer_name,
        phone: r.phone,
        created_at: now,
        updated_at: now,
      });
      createdVolunteers.set(r.volunteer_id, r.volunteer_id);
    }

    // 2. Location
    let locationId: number | null = null;
    if (r.latitude !== null || r.longitude !== null || r.location_label) {
      const createdLoc = (await LocationModel.create({
        latitude: r.latitude,
        longitude: r.longitude,
        accuracy: 10,
        label: r.location_label,
        address: r.location_label,
        region: r.region,
        municipality: r.municipality,
        neighborhood: "",
        created_at: now,
      })) as LocationRecord & { id: number };
      locationId = Number(createdLoc.id);
    }

    // 3. Report
    const createdRep = (await ReportModel.create({
      local_id: r.local_id,
      server_id: `report_${r.local_id.slice(4)}`,
      volunteer_id: r.volunteer_id,
      location_id: locationId,
      priority: r.priority,
      people_count: r.people_count || 1,
      injured: r.injured ?? null,
      trapped: r.trapped ?? null,
      children: r.children ?? null,
      elderly: r.elderly ?? null,
      description: r.description,
      emergency: r.source === 'donation' ? 0 : 1,
      assigned_to: null,
      source: r.source,
      status: r.status,
      status_changed_at: now,
      sync_status: "synced",
      sync_attempts: 1,
      last_sync_attempt: now,
      created_at: now,
      updated_at: now,
    })) as ReportRecord & { id: number };

    const repId = Number(createdRep.id);

    // 4. Report Needs (normalized)
    for (const need of r.needs) {
      await ReportNeedsModel.create({
        report_id: repId,
        need_code: need,
      });
    }

    // 5. Status History
    await ReportHistoryModel.create({
      report_id: repId,
      previous_status: null,
      next_status: r.status,
      changed_by: r.volunteer_id,
      changed_at: now,
      note: "Migración inicial 3NF",
    });
  }

  console.log(`🎉 3NF Migration and cleanup completed successfully! Seeded ${BASELINE_REAL_REPORTS.length} clean real records.`);
}

runMigration().catch(err => {
  console.error("Migration failed:", err);
  process.exit(1);
});
