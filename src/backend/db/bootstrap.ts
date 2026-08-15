import type { Client } from "@libsql/client";
import { VolunteerModel } from "../modules/volunteers/volunteer.model.js";
import { ReportHistoryModel, ReportModel, SyncEventModel } from "../modules/reports/report.model.js";
import { LocationModel } from "../modules/locations/location.model.js";
import { NeedsCatalogModel, ReportNeedsModel } from "../modules/reports/needs.model.js";
import { ReportPhotoModel } from "../modules/reports/photo.model.js";
import { PushSubscriptionModel } from "../modules/push/push.model.js";
import { ReportFlagModel } from "../modules/reports/flag.model.js";

const DEFAULT_NEEDS = [
  { code: "rescue", label: "RESCATE", icon: "🆘", category: "emergency" },
  { code: "medical", label: "MÉDICO", icon: "🏥", category: "emergency" },
  { code: "water", label: "AGUA", icon: "💧", category: "both" },
  { code: "food", label: "COMIDA", icon: "🍲", category: "both" },
  { code: "shelter", label: "REFUGIO", icon: "🏠", category: "emergency" },
  { code: "medication", label: "MEDICAMENTOS", icon: "💊", category: "both" },
  { code: "vulnerable", label: "VULNERABLE", icon: "👶", category: "emergency" },
  { code: "missing", label: "DESAPARECIDO", icon: "👤", category: "emergency" },
  { code: "pets", label: "MASCOTA", icon: "🐾", category: "both" },
  { code: "hygiene", label: "ASEO", icon: "🧼", category: "donation" },
  { code: "clothes", label: "ROPA", icon: "👕", category: "donation" },
  { code: "construction", label: "CONSTRUCCIÓN", icon: "🧱", category: "donation" },
  { code: "other", label: "OTRO", icon: "📦", category: "both" },
];

export async function bootstrapDatabase(client: Client) {
  await VolunteerModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      volunteer_id: "TEXT NOT NULL UNIQUE",
      name: "TEXT NOT NULL",
      phone: "TEXT",
      created_at: "TEXT NOT NULL",
      updated_at: "TEXT NOT NULL",
    },
    { tableName: "volunteers", tursoInstance: client }
  );

  await LocationModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      latitude: "REAL",
      longitude: "REAL",
      accuracy: "REAL",
      label: "TEXT",
      address: "TEXT",
      region: "TEXT",
      municipality: "TEXT",
      neighborhood: "TEXT",
      created_at: "TEXT NOT NULL",
    },
    { tableName: "locations", tursoInstance: client }
  );

  await NeedsCatalogModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      code: "TEXT NOT NULL UNIQUE",
      label: "TEXT NOT NULL",
      icon: "TEXT NOT NULL",
      category: "TEXT NOT NULL",
    },
    { tableName: "needs_catalog", tursoInstance: client }
  );

  // Seed default needs if table was just created
  try {
    const existing = await NeedsCatalogModel.findAll();
    if (existing.length === 0) {
      await NeedsCatalogModel.createMany(DEFAULT_NEEDS);
    }
  } catch (e) {
    // Ignore seed race conditions
  }

  await ReportModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      local_id: "TEXT NOT NULL UNIQUE",
      server_id: "TEXT UNIQUE",
      volunteer_id: "TEXT NOT NULL",
      location_id: "INTEGER",
      priority: "TEXT NOT NULL",
      people_count: "INTEGER NOT NULL DEFAULT 1",
      injured: "INTEGER",
      trapped: "INTEGER",
      children: "INTEGER",
      elderly: "INTEGER",
      description: "TEXT",
      emergency: "INTEGER NOT NULL DEFAULT 0",
      assigned_to: "TEXT",
      source: "TEXT NOT NULL",
      status: "TEXT NOT NULL",
      status_changed_at: "TEXT NOT NULL",
      sync_status: "TEXT NOT NULL",
      sync_attempts: "INTEGER NOT NULL DEFAULT 0",
      last_sync_attempt: "TEXT",
      created_at: "TEXT NOT NULL",
      updated_at: "TEXT NOT NULL",
    },
    {
      tableName: "reports",
      tursoInstance: client,
      foreignData: [
        { foreignKey: "location_id", table: "locations", tableId: "id" }
      ],
    }
  );

  await ReportNeedsModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      report_id: "INTEGER NOT NULL",
      need_code: "TEXT NOT NULL",
    },
    {
      tableName: "report_needs",
      tursoInstance: client,
      foreignData: [
        { foreignKey: "report_id", table: "reports", tableId: "id" }
      ],
    }
  );

  await ReportPhotoModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      report_id: "INTEGER NOT NULL",
      data_url: "TEXT NOT NULL",
      name: "TEXT",
      mime_type: "TEXT",
      size: "INTEGER",
      created_at: "TEXT NOT NULL",
    },
    {
      tableName: "report_photos",
      tursoInstance: client,
      foreignData: [
        { foreignKey: "report_id", table: "reports", tableId: "id" }
      ],
    }
  );

  await ReportHistoryModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      report_id: "INTEGER NOT NULL",
      previous_status: "TEXT",
      next_status: "TEXT NOT NULL",
      changed_by: "TEXT NOT NULL",
      changed_at: "TEXT NOT NULL",
      note: "TEXT",
    },
    {
      tableName: "report_status_history",
      tursoInstance: client,
      foreignData: [{ foreignKey: "report_id", table: "reports", tableId: "id" }],
    }
  );

  await ReportFlagModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      report_id: "INTEGER NOT NULL",
      flagged_by: "TEXT NOT NULL",
      reason: "TEXT NOT NULL",
      created_at: "TEXT NOT NULL",
    },
    {
      tableName: "report_flags",
      tursoInstance: client,
      foreignData: [{ foreignKey: "report_id", table: "reports", tableId: "id" }],
    }
  );

  await SyncEventModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      local_id: "TEXT NOT NULL",
      report_id: "INTEGER",
      outcome: "TEXT NOT NULL",
      created_at: "TEXT NOT NULL",
      payload_json: "TEXT NOT NULL",
    },
    {
      tableName: "sync_events",
      tursoInstance: client,
      foreignData: [{ foreignKey: "report_id", table: "reports", tableId: "id" }],
    }
  );

  await PushSubscriptionModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      endpoint: "TEXT NOT NULL UNIQUE",
      keys_json: "TEXT NOT NULL",
      cities: "TEXT NOT NULL",
      created_at: "TEXT NOT NULL",
    },
    { tableName: "push_subscriptions", tursoInstance: client }
  );
}
