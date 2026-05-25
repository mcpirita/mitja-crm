import { getDb } from "./getDb";
import type {
  LeadSpaceLink,
  LeadSpaceStatus,
  SpaceRow,
} from "@/lib/schemas";

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

/**
 * Возвращает список привязанных помещений к лиду с их статусами.
 * JOIN spaces чтобы получить полные строки SpaceRow.
 */
export async function listForLead(leadId: number): Promise<LeadSpaceLink[]> {
  const result = await getDb().execute({
    sql: `SELECT
            s.id              AS s_id,
            s.name            AS s_name,
            s.floor           AS s_floor,
            s.area_m2         AS s_area_m2,
            s.description     AS s_description,
            s.best_for        AS s_best_for,
            s.internal_notes  AS s_internal_notes,
            s.created_at      AS s_created_at,
            s.updated_at      AS s_updated_at,
            ls.status         AS ls_status,
            ls.created_at     AS ls_created_at
          FROM lead_spaces ls
          JOIN spaces s ON s.id = ls.space_id
          WHERE ls.lead_id = ?
          ORDER BY ls.created_at ASC`,
    args: [leadId],
  });

  return result.rows.map((row) => {
    const r = row as unknown as Row;
    return {
      space: rowToSpace({
        id: r.s_id,
        name: r.s_name,
        floor: r.s_floor,
        area_m2: r.s_area_m2,
        description: r.s_description,
        best_for: r.s_best_for,
        internal_notes: r.s_internal_notes,
        created_at: r.s_created_at,
        updated_at: r.s_updated_at,
      }),
      status: r.ls_status as LeadSpaceStatus,
      created_at: String(r.ls_created_at),
    };
  });
}

/**
 * Привязывает помещение к лиду. Возвращает запись с обновлённой статус-информацией.
 * Если уже привязано — обновляет статус.
 */
export async function attach(
  leadId: number,
  spaceId: number,
  status: LeadSpaceStatus = "considering",
): Promise<LeadSpaceLink | null> {
  const db = getDb();
  await db.execute({
    sql: `INSERT INTO lead_spaces (lead_id, space_id, status)
          VALUES (?, ?, ?)
          ON CONFLICT(lead_id, space_id) DO UPDATE SET status = excluded.status`,
    args: [leadId, spaceId, status],
  });

  // Возвращаем привязку.
  const result = await db.execute({
    sql: `SELECT
            s.id              AS s_id,
            s.name            AS s_name,
            s.floor           AS s_floor,
            s.area_m2         AS s_area_m2,
            s.description     AS s_description,
            s.best_for        AS s_best_for,
            s.internal_notes  AS s_internal_notes,
            s.created_at      AS s_created_at,
            s.updated_at      AS s_updated_at,
            ls.status         AS ls_status,
            ls.created_at     AS ls_created_at
          FROM lead_spaces ls
          JOIN spaces s ON s.id = ls.space_id
          WHERE ls.lead_id = ? AND ls.space_id = ?
          LIMIT 1`,
    args: [leadId, spaceId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as unknown as Row;
  return {
    space: rowToSpace({
      id: r.s_id,
      name: r.s_name,
      floor: r.s_floor,
      area_m2: r.s_area_m2,
      description: r.s_description,
      best_for: r.s_best_for,
      internal_notes: r.s_internal_notes,
      created_at: r.s_created_at,
      updated_at: r.s_updated_at,
    }),
    status: r.ls_status as LeadSpaceStatus,
    created_at: String(r.ls_created_at),
  };
}

export async function detach(
  leadId: number,
  spaceId: number,
): Promise<boolean> {
  const result = await getDb().execute({
    sql: "DELETE FROM lead_spaces WHERE lead_id = ? AND space_id = ?",
    args: [leadId, spaceId],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function updateStatus(
  leadId: number,
  spaceId: number,
  status: LeadSpaceStatus,
): Promise<LeadSpaceLink | null> {
  const db = getDb();
  const upd = await db.execute({
    sql: "UPDATE lead_spaces SET status = ? WHERE lead_id = ? AND space_id = ?",
    args: [status, leadId, spaceId],
  });
  if ((upd.rowsAffected ?? 0) === 0) return null;

  const result = await db.execute({
    sql: `SELECT
            s.id              AS s_id,
            s.name            AS s_name,
            s.floor           AS s_floor,
            s.area_m2         AS s_area_m2,
            s.description     AS s_description,
            s.best_for        AS s_best_for,
            s.internal_notes  AS s_internal_notes,
            s.created_at      AS s_created_at,
            s.updated_at      AS s_updated_at,
            ls.status         AS ls_status,
            ls.created_at     AS ls_created_at
          FROM lead_spaces ls
          JOIN spaces s ON s.id = ls.space_id
          WHERE ls.lead_id = ? AND ls.space_id = ?
          LIMIT 1`,
    args: [leadId, spaceId],
  });
  if (result.rows.length === 0) return null;
  const r = result.rows[0] as unknown as Row;
  return {
    space: rowToSpace({
      id: r.s_id,
      name: r.s_name,
      floor: r.s_floor,
      area_m2: r.s_area_m2,
      description: r.s_description,
      best_for: r.s_best_for,
      internal_notes: r.s_internal_notes,
      created_at: r.s_created_at,
      updated_at: r.s_updated_at,
    }),
    status: r.ls_status as LeadSpaceStatus,
    created_at: String(r.ls_created_at),
  };
}
