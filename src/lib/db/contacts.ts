import { getDb } from "./getDb";
import type { ContactCreate, ContactRow, ContactUpdate } from "@/lib/schemas";

type SqlArg = string | number | null;

function rowToContact(row: Record<string, unknown>): ContactRow {
  return {
    id: Number(row.id),
    lead_id: Number(row.lead_id),
    name: String(row.name),
    email: (row.email as string | null) ?? null,
    role: (row.role as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export async function listContacts(leadId: number): Promise<ContactRow[]> {
  const result = await getDb().execute({
    sql: "SELECT * FROM lead_contacts WHERE lead_id = ? ORDER BY id ASC",
    args: [leadId],
  });
  return result.rows.map((r) =>
    rowToContact(r as unknown as Record<string, unknown>),
  );
}

export async function getContact(id: number): Promise<ContactRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM lead_contacts WHERE id = ? LIMIT 1",
    args: [id],
  });
  if (result.rows.length === 0) return null;
  return rowToContact(result.rows[0] as unknown as Record<string, unknown>);
}

export async function createContact(
  leadId: number,
  input: ContactCreate,
): Promise<ContactRow> {
  const result = await getDb().execute({
    sql: `INSERT INTO lead_contacts (lead_id, name, email, role, notes)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *`,
    args: [
      leadId,
      input.name ?? "",
      input.email ?? null,
      input.role ?? null,
      input.notes ?? null,
    ],
  });
  if (result.rows.length === 0) {
    throw new Error("Не удалось создать контакт");
  }
  return rowToContact(result.rows[0] as unknown as Record<string, unknown>);
}

export async function updateContact(
  id: number,
  patch: ContactUpdate,
): Promise<ContactRow | null> {
  const fields: string[] = [];
  const args: SqlArg[] = [];

  const set = (col: string, value: SqlArg) => {
    fields.push(`${col} = ?`);
    args.push(value);
  };

  if (patch.name !== undefined) set("name", patch.name ?? "");
  if (patch.email !== undefined) set("email", patch.email ?? null);
  if (patch.role !== undefined) set("role", patch.role ?? null);
  if (patch.notes !== undefined) set("notes", patch.notes ?? null);

  if (fields.length === 0) {
    return getContact(id);
  }

  args.push(id);
  const result = await getDb().execute({
    sql: `UPDATE lead_contacts SET ${fields.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });
  if (result.rows.length === 0) return null;
  return rowToContact(result.rows[0] as unknown as Record<string, unknown>);
}

export async function deleteContact(id: number): Promise<boolean> {
  const result = await getDb().execute({
    sql: "DELETE FROM lead_contacts WHERE id = ?",
    args: [id],
  });
  return (result.rowsAffected ?? 0) > 0;
}
