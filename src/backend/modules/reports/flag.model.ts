import Model from "../../../shared/orm/Model.js";

export interface ReportFlagRecord {
  id: number;
  report_id: number;
  flagged_by: string;
  reason: string;
  created_at: string;
}

export class ReportFlagModel extends Model {}
