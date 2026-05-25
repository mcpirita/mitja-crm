import { getDb } from "./getDb";
import type {
  EventType,
  OutreachEventCreate,
  OutreachEventRow,
} from "@/lib/schemas";

function rowToEvent(row: Record<string, unknown>): OutreachEventRow {
  return {
    id: Number(row.id),
    lead_id: Number(row.lead_id),
    type: row.type as EventType,
    happened_at: String(row.happened_at),
    subject: (row.subject as string | null) ?? null,
    body_snippet: (row.body_snippet as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function listEventsForLead(leadId: number): Promise<OutreachEventRow[]> {
  const result = await getDb().execute({
    sql: "SELECT * FROM outreach_events WHERE lead_id = ? ORDER BY happened_at DESC, id DESC",
    args: [leadId],
  });
  return result.rows.map((r) => rowToEvent(r as unknown as Record<string, unknown>));
}

export async function createEvent(input: OutreachEventCreate): Promise<OutreachEventRow> {
  const happenedAt = input.happened_at ?? null;

  const result = await getDb().execute({
    sql: happenedAt
      ? `INSERT INTO outreach_events (lead_id, type, happened_at, subject, body_snippet, notes)
         VALUES (?, ?, ?, ?, ?, ?)
         RETURNING *`
      : `INSERT INTO outreach_events (lead_id, type, subject, body_snippet, notes)
         VALUES (?, ?, ?, ?, ?)
         RETURNING *`,
    args: happenedAt
      ? [
          input.lead_id,
          input.type,
          happenedAt,
          input.subject ?? null,
          input.body_snippet ?? null,
          input.notes ?? null,
        ]
      : [
          input.lead_id,
          input.type,
          input.subject ?? null,
          input.body_snippet ?? null,
          input.notes ?? null,
        ],
  });
  if (result.rows.length === 0) {
    throw new Error("Не удалось создать событие");
  }
  return rowToEvent(result.rows[0] as unknown as Record<string, unknown>);
}

export async function latestEventByType(
  leadId: number,
  type: EventType
): Promise<OutreachEventRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM outreach_events WHERE lead_id = ? AND type = ? ORDER BY happened_at DESC, id DESC LIMIT 1",
    args: [leadId, type],
  });
  if (result.rows.length === 0) return null;
  return rowToEvent(result.rows[0] as unknown as Record<string, unknown>);
}

export async function latestEvent(leadId: number): Promise<OutreachEventRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM outreach_events WHERE lead_id = ? ORDER BY happened_at DESC, id DESC LIMIT 1",
    args: [leadId],
  });
  if (result.rows.length === 0) return null;
  return rowToEvent(result.rows[0] as unknown as Record<string, unknown>);
}
