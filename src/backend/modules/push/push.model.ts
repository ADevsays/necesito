import Model from "../../../shared/orm/Model.js";

export type PushSubscriptionRecord = {
  id: number;
  endpoint: string;
  keys_json: string;
  cities: string;
  created_at: string;
};

export class PushSubscriptionModel extends Model {}
