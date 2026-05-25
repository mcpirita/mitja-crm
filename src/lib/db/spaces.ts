import { getDb } from "./getDb";
import type { SpaceCreate, SpaceRow, SpaceUpdate } from "@/lib/schemas";

type SqlArg = string | number | null;
type Row = Record<string, unknown>;

function rowToSpace(row: Row): SpaceRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    floor: (row.floor as string | null) ?? null,
    area_m2:
      row.area_m2 === null || row.area_m2 === undefined
        ? null
        : Number(row.area_m2),
    description: String(row.description ?? ""),
    best_for: String(row.best_for ?? ""),
    internal_notes: String(row.internal_notes ?? ""),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export interface ListSpacesFilters {
  best_for?: string;
}

export async function listSpaces(
  filters: ListSpacesFilters = {},
): Promise<SpaceRow[]> {
  const where: string[] = [];
  const args: SqlArg[] = [];

  if (filters.best_for && filters.best_for.trim().length > 0) {
    // best_for хранится как CSV "pilates,yoga,physio".
    // Подбираем по «слову» через границы (запятая или начало/конец строки).
    // SQLite LIKE регистро-нечувствителен только для ASCII — нам ок (значения латиница).
    where.push(
      "(',' || best_for || ',') LIKE ?",
    );
    args.push(`%,${filters.best_for.trim()},%`);
  }

  const sql =
    "SELECT * FROM spaces" +
    (where.length > 0 ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY id ASC";

  const result = await getDb().execute({ sql, args });
  return result.rows.map((r) => rowToSpace(r as unknown as Row));
}

export async function getSpace(id: number): Promise<SpaceRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM spaces WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToSpace(result.rows[0] as unknown as Row);
}

export async function createSpace(input: SpaceCreate): Promise<SpaceRow> {
  const result = await getDb().execute({
    sql: `INSERT INTO spaces
      (name, floor, area_m2, description, best_for, internal_notes)
      VALUES (?, ?, ?, ?, ?, ?)
      RETURNING *`,
    args: [
      input.name,
      input.floor ?? null,
      input.area_m2 ?? null,
      input.description ?? "",
      input.best_for ?? "",
      input.internal_notes ?? "",
    ],
  });
  if (result.rows.length === 0) {
    throw new Error("Не удалось создать помещение");
  }
  return rowToSpace(result.rows[0] as unknown as Row);
}

export async function updateSpace(
  id: number,
  patch: SpaceUpdate,
): Promise<SpaceRow | null> {
  const fields: string[] = [];
  const args: SqlArg[] = [];

  const set = (col: string, value: SqlArg) => {
    fields.push(`${col} = ?`);
    args.push(value);
  };

  if (patch.name !== undefined) set("name", patch.name);
  if (patch.floor !== undefined) set("floor", patch.floor ?? null);
  if (patch.area_m2 !== undefined) set("area_m2", patch.area_m2 ?? null);
  if (patch.description !== undefined) set("description", patch.description ?? "");
  if (patch.best_for !== undefined) set("best_for", patch.best_for ?? "");
  if (patch.internal_notes !== undefined)
    set("internal_notes", patch.internal_notes ?? "");

  if (fields.length === 0) {
    return getSpace(id);
  }

  fields.push("updated_at = datetime('now')");
  args.push(id);

  const result = await getDb().execute({
    sql: `UPDATE spaces SET ${fields.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });
  if (result.rows.length === 0) return null;
  return rowToSpace(result.rows[0] as unknown as Row);
}

export async function deleteSpace(id: number): Promise<boolean> {
  const result = await getDb().execute({
    sql: "DELETE FROM spaces WHERE id = ?",
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}
