export type PossibleAttr = string | number | boolean | null | undefined | Date;

export interface ForeignData {
  foreignKey: string;
  table: string;
  tableId: string;
}

export type BaseObj = Record<string, string>;

export interface QueryOrder {
  column: string;
  direction: "ASC" | "DESC";
}

export interface FindJoinOptions {
  include?: {
    model: string;
    attributes?: string[];
    joinType?: string;
  }[];
  attributes?: string[];
  where?: Record<string, PossibleAttr>;
  order?: QueryOrder[];
}
