import { getDb } from "@/lib/db/getDb";
import type {
  EmailTemplateCreate,
  EmailTemplateRow,
  EmailTemplateUpdate,
} from "@/lib/schemas";
import type { SegmentWithAny, TemplateKind } from "@/lib/schemas";

type Row = Record<string, unknown>;

function rowToTemplate(row: Row): EmailTemplateRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    language: row.language as EmailTemplateRow["language"],
    segment: row.segment as EmailTemplateRow["segment"],
    kind: row.kind as EmailTemplateRow["kind"],
    subject: String(row.subject),
    body: String(row.body),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listTemplates(filters: {
  segment?: SegmentWithAny;
  kind?: TemplateKind;
} = {}): Promise<EmailTemplateRow[]> {
  const db = getDb();
  const where: string[] = [];
  const args: (string | number)[] = [];

  if (filters.segment) {
    where.push("segment = ?");
    args.push(filters.segment);
  }
  if (filters.kind) {
    where.push("kind = ?");
    args.push(filters.kind);
  }

  const sql =
    "SELECT * FROM email_templates" +
    (where.length ? ` WHERE ${where.join(" AND ")}` : "") +
    " ORDER BY updated_at DESC, id DESC";

  const result = await db.execute({ sql, args });
  return result.rows.map((r) => rowToTemplate(r as Row));
}

export async function getTemplate(id: number): Promise<EmailTemplateRow | null> {
  const db = getDb();
  const result = await db.execute({
    sql: "SELECT * FROM email_templates WHERE id = ?",
    args: [id],
  });
  const row = result.rows[0];
  return row ? rowToTemplate(row as Row) : null;
}

export async function createTemplate(
  input: EmailTemplateCreate,
): Promise<EmailTemplateRow> {
  const db = getDb();
  const result = await db.execute({
    sql:
      "INSERT INTO email_templates (name, language, segment, kind, subject, body) " +
      "VALUES (?, ?, ?, ?, ?, ?) RETURNING *",
    args: [
      input.name,
      input.language,
      input.segment,
      input.kind,
      input.subject,
      input.body,
    ],
  });
  return rowToTemplate(result.rows[0] as Row);
}

export async function updateTemplate(
  id: number,
  input: EmailTemplateUpdate,
): Promise<EmailTemplateRow | null> {
  const db = getDb();
  const sets: string[] = [];
  const args: (string | number)[] = [];

  const keys: (keyof EmailTemplateUpdate)[] = [
    "name",
    "language",
    "segment",
    "kind",
    "subject",
    "body",
  ];

  for (const key of keys) {
    const value = input[key];
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      args.push(value);
    }
  }

  if (sets.length === 0) {
    return getTemplate(id);
  }

  sets.push("updated_at = datetime('now')");
  args.push(id);

  const result = await db.execute({
    sql: `UPDATE email_templates SET ${sets.join(", ")} WHERE id = ? RETURNING *`,
    args,
  });
  const row = result.rows[0];
  return row ? rowToTemplate(row as Row) : null;
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const db = getDb();
  const result = await db.execute({
    sql: "DELETE FROM email_templates WHERE id = ?",
    args: [id],
  });
  return result.rowsAffected > 0;
}

export async function findBestMatch(
  segment: SegmentWithAny,
  kind: TemplateKind,
): Promise<EmailTemplateRow | null> {
  const db = getDb();
  // Сначала точное совпадение сегмента.
  if (segment !== "any") {
    const exact = await db.execute({
      sql:
        "SELECT * FROM email_templates WHERE segment = ? AND kind = ? " +
        "ORDER BY updated_at DESC, id DESC LIMIT 1",
      args: [segment, kind],
    });
    if (exact.rows[0]) return rowToTemplate(exact.rows[0] as Row);
  }
  // Fallback на segment='any'.
  const fallback = await db.execute({
    sql:
      "SELECT * FROM email_templates WHERE segment = 'any' AND kind = ? " +
      "ORDER BY updated_at DESC, id DESC LIMIT 1",
    args: [kind],
  });
  return fallback.rows[0] ? rowToTemplate(fallback.rows[0] as Row) : null;
}
