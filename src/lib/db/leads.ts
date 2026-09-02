import { getDb } from "./getDb";
import type {
  DealType,
  LeadCreate,
  LeadRow,
  LeadUpdate,
  LeadStatus,
  Priority,
  Segment,
} from "@/lib/schemas";

type SqlArg = string | number | null;

function rowToLead(row: Record<string, unknown>): LeadRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    company: String(row.company),
    email: (row.email as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    country: String(row.country),
    city: (row.city as string | null) ?? null,
    segment: row.segment as Segment,
    source: row.source as LeadRow["source"],
    status: row.status as LeadStatus,
    deal_type: (row.deal_type as DealType) ?? "rent",
    priority: (row.priority as Priority) ?? "medium",
    hook_text: (row.hook_text as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    last_status_raw: (row.last_status_raw as string | null) ?? null,
    next_action_due: (row.next_action_due as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export interface ListLeadsFilters {
  segment?: Segment;
  status?: LeadStatus;
  deal_type?: DealType;
  q?: string;
}

export async function listLeads(filters: ListLeadsFilters = {}): Promise<LeadRow[]> {
  const where: string[] = [];
  const args: SqlArg[] = [];

  if (filters.segment) {
    where.push("segment = ?");
    args.push(filters.segment);
  }
  if (filters.status) {
    where.push("status = ?");
    args.push(filters.status);
  }
  if (filters.deal_type) {
    where.push("deal_type = ?");
    args.push(filters.deal_type);
  }
  if (filters.q && filters.q.trim().length > 0) {
    where.push("(name LIKE ? OR company LIKE ?)");
    const like = `%${filters.q.trim()}%`;
    args.push(like, like);
  }

  const sql =
    "SELECT * FROM leads" +
    (where.length > 0 ? " WHERE " + where.join(" AND ") : "") +
    " ORDER BY updated_at DESC";

  const result = await getDb().execute({ sql, args });
  return result.rows.map((r) => rowToLead(r as unknown as Record<string, unknown>));
}

export async function getLead(id: number): Promise<LeadRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM leads WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToLead(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createLead(input: LeadCreate): Promise<LeadRow> {
  const db = getDb();
  const result = await db.execute({
    sql: `INSERT INTO leads
      (name, company, email, website, country, city, segment, source, status,
       deal_type, priority, hook_text, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING *`,
    args: [
      input.name ?? "",
      input.company,
      input.email ?? null,
      input.website ?? null,
      input.country,
      input.city ?? null,
      input.segment,
      input.source,
      input.status,
      input.deal_type,
      input.priority,
      input.hook_text ?? null,
      input.notes ?? null,
    ],
  });
  if (result.rows.length === 0) {
    throw new Error("Не удалось создать лид");
  }
  return rowToLead(result.rows[0] as unknown as Record<string, unknown>);
}

export async function updateLead(id: number, patch: LeadUpdate): Promise<LeadRow | null> {
  const fields: string[] = [];
  const args: SqlArg[] = [];

  const set = (col: string, value: SqlArg) => {
    fields.push(`${col} = ?`);
    args.push(value);
  };

  if (patch.name !== undefined) set("name", patch.name ?? "");
  if (patch.company !== undefined) set("company", patch.company);
  if (patch.email !== undefined) set("email", patch.email ?? null);
  if (patch.website !== undefined) set("website", patch.website ?? null);
  if (patch.country !== undefined) set("country", patch.country);
  if (patch.city !== undefined) set("city", patch.city ?? null);
  if (patch.segment !== undefined) set("segment", patch.segment);
  if (patch.source !== undefined) set("source", patch.source);
  if (patch.status !== undefined) set("status", patch.status);
  if (patch.deal_type !== undefined) set("deal_type", patch.deal_type);
  if (patch.priority !== undefined) set("priority", patch.priority);
  if (patch.hook_text !== undefined) set("hook_text", patch.hook_text ?? null);
  if (patch.notes !== undefined) set("notes", patch.notes ?? null);

  if (fields.length === 0) {
    return getLead(id);
  }

  fields.push("updated_at = datetime('now')");
  args.push(id);

  const result = await getDb().execute({
    sql: `UPDATE leads SET ${fields.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });
  if (result.rows.length === 0) return null;
  return rowToLead(result.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteLead(id: number): Promise<boolean> {
  const result = await getDb().execute({
    sql: "DELETE FROM leads WHERE id = ?",
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export async function setLeadStatus(
  id: number,
  status: LeadStatus
): Promise<LeadRow | null> {
  const result = await getDb().execute({
    sql: "UPDATE leads SET status = ?, updated_at = datetime('now') WHERE id = ? RETURNING *",
    args: [status, id],
  });
  if (result.rows.length === 0) return null;
  return rowToLead(result.rows[0] as unknown as Record<string, unknown>);
}
