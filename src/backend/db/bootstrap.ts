import type { Client } from "@libsql/client";
import { VolunteerModel } from "../modules/volunteers/volunteer.model.js";
import { ReportHistoryModel, ReportModel, SyncEventModel } from "../modules/reports/report.model.js";
import { PushSubscriptionModel } from "../modules/push/push.model.js";

export async function bootstrapDatabase(client: Client) {
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

  await ReportModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      local_id: "TEXT NOT NULL UNIQUE",
      server_id: "TEXT UNIQUE",
      volunteer_id: "TEXT NOT NULL",
      volunteer_name: "TEXT NOT NULL",
      phone: "TEXT",
      created_at: "TEXT NOT NULL",
      updated_at: "TEXT NOT NULL",
      sync_status: "TEXT NOT NULL",
      sync_attempts: "INTEGER NOT NULL DEFAULT 0",
      last_sync_attempt: "TEXT",
      status: "TEXT NOT NULL",
      status_changed_at: "TEXT NOT NULL",
      region: "TEXT",
      municipality: "TEXT",
      neighborhood: "TEXT",
      latitude: "REAL",
      longitude: "REAL",
      accuracy: "REAL",
      location_label: "TEXT",
      location_address: "TEXT",
      needs_json: "TEXT NOT NULL",
      priority: "TEXT NOT NULL",
      people_count: "INTEGER NOT NULL",
      injured: "INTEGER",
      trapped: "INTEGER",
      children: "INTEGER",
      elderly: "INTEGER",
      description: "TEXT",
      emergency: "INTEGER NOT NULL DEFAULT 0",
      photos_json: "TEXT NOT NULL",
      assigned_to: "TEXT",
      source: "TEXT NOT NULL",
    },
    { tableName: "reports", tursoInstance: client }
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

  await SyncEventModel.init(
    {
      id: "INTEGER PRIMARY KEY AUTOINCREMENT",
      local_id: "TEXT NOT NULL UNIQUE",
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
}
