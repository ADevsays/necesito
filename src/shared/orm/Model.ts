import { Client, InValue } from "@libsql/client";
import type { BaseObj, FindJoinOptions, ForeignData, PossibleAttr, QueryOrder } from "./types.js";

interface DbConfig {
  tableName: string;
  tursoInstance: Client;
  foreignData?: ForeignData[];
}

type DataOptionsFindWhere<T extends object> =
  | Partial<Record<keyof T, PossibleAttr>>
  | { where?: Partial<Record<keyof T, PossibleAttr>>; order?: QueryOrder };

function normalizeValue(value: PossibleAttr): InValue {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === undefined || value === null) return "";
  return value as InValue;
}

function normalizeObject(data: object) {
  return Object.fromEntries(
    Object.entries(data as Record<string, unknown>).map(([key, value]) => [key, normalizeValue(value as PossibleAttr)])
  );
}

class Model {
  private static turso: Client | null = null;
  protected static tableName = "";
  protected static attributes: BaseObj = {};
  protected static foreignData: BaseObj = {};
  protected static createdTable = false;
  private static initialized = false;

  public static async init(attributes: BaseObj, dbConfig: DbConfig) {
    if (this.initialized) return;
    const { tableName, tursoInstance, foreignData } = dbConfig;
    this.turso = tursoInstance;
    this.tableName = tableName;
    this.attributes = attributes;
    await this.createTable(foreignData);
    this.initialized = true;
  }

  private static async createTable(foreignData?: ForeignData[]) {
    if (this.createdTable) return;
    if (!this.turso) throw new Error("No hay instancia de Turso");

    const buildAttributes = Object.entries(this.attributes).map(([key, value]) => `${key} ${value}`);
    if (foreignData) {
      for (const { foreignKey, table, tableId } of foreignData) {
        buildAttributes.push(`FOREIGN KEY (${foreignKey}) REFERENCES ${table}(${tableId})`);
      }
    }

    await this.turso.execute(`CREATE TABLE IF NOT EXISTS ${this.tableName} (${buildAttributes.join(", ")})`);
    this.createdTable = true;
  }

  public static async query<T extends object>(sql: string, args: InValue[] = []): Promise<T[]> {
    if (!this.turso) throw new Error("No hay instancia de Turso");
    const result = await this.turso.execute({ sql, args });
    return result.rows as unknown as T[];
  }

  public static async execute(sql: string, args: InValue[] = []) {
    if (!this.turso) throw new Error("No hay instancia de Turso");
    return this.turso.execute({ sql, args });
  }

  public static async dropTable() {
    if (!this.turso) throw new Error("No hay instancia de Turso");
    await this.turso.execute(`DROP TABLE ${this.tableName}`);
  }

  public static async findAll<T extends object>(): Promise<T[]> {
    const result = await this.query<T>(`SELECT * FROM ${this.tableName}`);
    return result;
  }

  public static async findJoin<T extends object>(options: FindJoinOptions): Promise<T[]> {
    if (!this.turso) throw new Error("No hay instancia de Turso");

    const { include, attributes, where, order } = options;
    const selectFields = [
      ...(attributes?.map((attr) => `${this.tableName}.${attr}`) || ["*"]),
      ...(include?.flatMap((inc) => inc.attributes?.map((attr) => `${inc.model}.${attr}`) || []) || []),
    ].join(", ");

    let joinClauses = "";
    if (include) {
      joinClauses = include
        .map((inc) => {
          const modelId = `${this.tableName}.id${inc.model.slice(0, -1)}`;
          return `${inc.joinType || "INNER JOIN"} ${inc.model} ON ${inc.model}.id = ${modelId}`;
        })
        .join(" ");
    }

    let whereClause = "";
    const whereArgs: InValue[] = [];
    if (where) {
      whereClause = Object.entries(where)
        .map(([key, value]) => {
          if (value === undefined) throw new Error(`El valor de ${key} no puede ser undefined`);
          whereArgs.push(normalizeValue(value));
          return `${key} = ?`;
        })
        .join(" AND ");
    }

    const orderClause = order?.length ? `ORDER BY ${order.map((item) => `${item.column} ${item.direction}`).join(", ")}` : "";
    const query = `SELECT ${selectFields} FROM ${this.tableName} ${joinClauses} ${whereClause ? `WHERE ${whereClause}` : ""} ${orderClause}`;
    const result = await this.turso.execute({ sql: query, args: whereArgs });
    return result.rows as T[];
  }

  public static async findOne<T extends object>(
    dataOrOptions: DataOptionsFindWhere<T>
  ): Promise<T | null> {
    const options = "where" in dataOrOptions || "order" in dataOrOptions
      ? {
          where: (dataOrOptions as { where?: Partial<Record<keyof T, PossibleAttr>> }).where || {},
          order: (dataOrOptions as { order?: QueryOrder }).order,
        }
      : { where: dataOrOptions as Partial<Record<keyof T, PossibleAttr>> };

    const parts = Object.entries((options.where || {}) as Record<string, PossibleAttr>).map(([key, value]) => {
      if (value === undefined) throw new Error(`El valor de ${key} no puede ser undefined`);
      if (typeof value === "string") {
        return {
          clause: `LOWER(REPLACE(REPLACE(${key}, '.', ''), ',', '')) = ?`,
          arg: value.replace(/[.,]/g, "").trim().toLowerCase(),
        };
      }
      return { clause: `${key} = ?`, arg: normalizeValue(value) };
    });
    const whereClause = parts.length ? ` WHERE ${parts.map((part) => part.clause).join(" AND ")}` : "";
    const args = parts.map((part) => part.arg);

    let query = `SELECT * FROM ${this.tableName}${whereClause}`;
    if (options.order) {
      query += ` ORDER BY ${options.order.column} ${options.order.direction}`;
    }
    query += ` LIMIT 1`;

    const result = await this.turso?.execute({ sql: query, args });
    const elementFind = result?.rows[0] as T | undefined;
    return !result || result.rows.length === 0 ? null : (elementFind as T);
  }

  public static async findLast<T extends object>(): Promise<T | null> {
    const result = await this.query<T>(`SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT 1`);
    return result[0] ?? null;
  }

  public static async findIn<T extends object>(
    column: keyof T,
    values: string[]
  ): Promise<T[]> {
    if (values.length === 0) throw new Error("El array de valores está vacío.");
    const cleanValue = (str: string) => str.replace(/[.,]/g, "").trim().toLowerCase();
    const patterns = values.map((value) => `%${cleanValue(value)}%`);
    const whereClauses = patterns
      .map(() => `LOWER(REPLACE(REPLACE(${String(column)}, '.', ''), ',', '')) LIKE ?`)
      .join(" OR ");
    const query = `SELECT * FROM ${this.tableName} WHERE ${whereClauses}`;
    return this.query<T>(query, patterns as InValue[]);
  }

  public static async createMany<T extends object>(data: T[]) {
    if (data.length === 0) throw new Error("No hay datos para insertar");
    const first = data[0] as object;
    const attributes = Object.keys(first).join(", ");
    const placeholders = `(${Object.keys(first).map(() => "?").join(", ")})`;
    const values = data.flatMap((item) => Object.values(normalizeObject(item)));
    const query = `INSERT INTO ${this.tableName} (${attributes}) VALUES ${data.map(() => placeholders).join(", ")}`;
    await this.execute(query, values as InValue[]);
    const insertedItems = await this.query<T>(`SELECT * FROM ${this.tableName} ORDER BY id DESC LIMIT ${data.length}`);
    return insertedItems.reverse();
  }

  public static async create<T extends object>(data: T) {
    const normalized = normalizeObject(data);
    const attributes = Object.keys(normalized).join(", ");
    const values = Object.values(normalized);
    const query = `INSERT INTO ${this.tableName} (${attributes}) VALUES (${values.map(() => "?").join(", ")})`;
    const result = await this.execute(query, values as InValue[]);
    return { ...normalized, id: Number(result.lastInsertRowid ?? 0) } as T & { id: number };
  }

  public static async update<T extends object>(
    id: number | string,
    data: Partial<Record<keyof T, PossibleAttr>>
  ): Promise<string | null> {
    const entries = Object.entries(data);
    if (entries.length === 0) return null;
    const attributesToUpdate = entries.map(([key]) => `${key} = ?`);
    const valuesToUpdate = entries.map(([, value]) => normalizeValue(value as PossibleAttr));
    const query = `UPDATE ${this.tableName} SET ${attributesToUpdate.join(", ")} WHERE id = ?`;
    await this.execute(query, [...valuesToUpdate, id as InValue]);
    return `Elemento ${id} actualizado!`;
  }
}

export default Model;
