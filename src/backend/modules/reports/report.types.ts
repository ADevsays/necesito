export type SyncStatus = "pending" | "syncing" | "synced" | "failed";

export type ReportStatus = "new" | "assigned" | "in_progress" | "resolved" | "invalid";

export type Priority = "critical" | "urgent" | "necessary";

export interface ReportSyncLocationInput {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  timestamp?: string | null;
  label?: string | null;
  address?: string | null;
  region?: string | null;
  municipality?: string | null;
  neighborhood?: string | null;
}

export interface ReportSyncInput {
  local_id: string;
  volunteer_id: string;
  volunteer_name?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
  sync_status?: SyncStatus;
  sync_attempts?: number;
  last_sync_attempt?: string | null;
  status?: ReportStatus;
  status_changed_at?: string;
  region?: string;
  municipality?: string;
  neighborhood?: string;
  location?: ReportSyncLocationInput | null;
  needs?: string[];
  priority?: Priority;
  people_count?: string | number;
  injured?: boolean;
  trapped?: boolean;
  children?: boolean;
  elderly?: boolean;
  description?: string;
  emergency?: boolean;
  photos?: Array<{ name?: string; type?: string; dataUrl?: string; size?: number }>;
  assigned_to?: string | null;
  source?: string;
}

export interface ReportRecord {
  id: number;
  local_id: string;
  server_id: string | null;
  volunteer_id: string;
  volunteer_name: string;
  phone: string | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  sync_attempts: number;
  last_sync_attempt: string | null;
  status: ReportStatus;
  status_changed_at: string;
  region: string | null;
  municipality: string | null;
  neighborhood: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  location_label: string | null;
  location_address: string | null;
  needs_json: string;
  priority: Priority;
  people_count: number;
  injured: number;
  trapped: number;
  children: number;
  elderly: number;
  description: string | null;
  emergency: number;
  photos_json: string;
  assigned_to: string | null;
  source: string;
}

export interface ReportHistoryRecord {
  id: number;
  report_id: number;
  previous_status: ReportStatus | null;
  next_status: ReportStatus;
  changed_by: string;
  changed_at: string;
  note: string | null;
}

export interface SyncEventRecord {
  id: number;
  local_id: string;
  report_id: number | null;
  outcome: string;
  created_at: string;
  payload_json: string;
}
