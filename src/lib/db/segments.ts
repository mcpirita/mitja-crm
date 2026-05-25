import { getDb } from "./getDb";
import type { SegmentRow, SegmentCreate, SegmentUpdate } from "@/lib/schemas";

type Row = Record<string, unknown>;
type SqlArg = string | number | null;

const CYR_MAP: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo",
  ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u",
  ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "shch",
  ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

function transliterate(input: string): string {
  let out = "";
  for (const ch of input.toLowerCase()) {
    out += ch in CYR_MAP ? CYR_MAP[ch] : ch;
  }
  return out;
}

export function slugifyLabel(label: string): string {
  const translit = transliterate(label);
  const slug = translit
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Не удалось сгенерировать slug из лейбла");
  }
  return slug;
}

function rowToSegment(row: Row): SegmentRow {
  return {
    slug: String(row.slug),
    label_ru: String(row.label_ru),
    color: String(row.color),
    sort_order: Number(row.sort_order),
    is_archived: Number(row.is_archived),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listSegments(
  options: { includeArchived?: boolean } = {},
): Promise<SegmentRow[]> {
  const { includeArchived = false } = options;
  const sql = includeArchived
    ? "SELECT * FROM segments ORDER BY is_archived ASC, sort_order ASC, label_ru ASC"
    : "SELECT * FROM segments WHERE is_archived = 0 ORDER BY is_archived ASC, sort_order ASC, label_ru ASC";
  const result = await getDb().execute({ sql, args: [] });
  return result.rows.map((r) => rowToSegment(r as Row));
}

export async function getSegment(slug: string): Promise<SegmentRow | null> {
  const result = await getDb().execute({
    sql: "SELECT * FROM segments WHERE slug = ? LIMIT 1",
    args: [slug],
  });
  if (result.rows.length === 0) return null;
  return rowToSegment(result.rows[0] as Row);
}

async function nextFreeSlug(base: string): Promise<string> {
  let candidate = base;
  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await getSegment(candidate);
    if (!existing) return candidate;
    candidate = `${base}-${n}`;
    n += 1;
  }
}

async function nextSortOrder(): Promise<number> {
  const result = await getDb().execute({
    sql: "SELECT MAX(sort_order) AS max_sort FROM segments",
    args: [],
  });
  const max = result.rows[0]?.max_sort;
  if (max === null || max === undefined) return 1000;
  const n = Number(max);
  if (!Number.isFinite(n)) return 1000;
  return n + 10;
}

export async function createSegment(input: SegmentCreate): Promise<SegmentRow> {
  const baseSlug = input.slug && input.slug.length > 0
    ? input.slug
    : slugifyLabel(input.label_ru);
  const slug = await nextFreeSlug(baseSlug);
  const sortOrder = await nextSortOrder();
  const color = input.color ?? "zinc";

  const result = await getDb().execute({
    sql:
      "INSERT INTO segments (slug, label_ru, color, sort_order) " +
      "VALUES (?, ?, ?, ?) RETURNING *",
    args: [slug, input.label_ru, color, sortOrder],
  });
  if (result.rows.length === 0) {
    throw new Error("Не удалось создать сегмент");
  }
  return rowToSegment(result.rows[0] as Row);
}

export async function updateSegment(
  slug: string,
  patch: SegmentUpdate,
): Promise<SegmentRow | null> {
  const sets: string[] = [];
  const args: SqlArg[] = [];

  if (patch.label_ru !== undefined) {
    sets.push("label_ru = ?");
    args.push(patch.label_ru);
  }
  if (patch.color !== undefined) {
    sets.push("color = ?");
    args.push(patch.color);
  }
  if (patch.sort_order !== undefined) {
    sets.push("sort_order = ?");
    args.push(patch.sort_order);
  }
  if (patch.is_archived !== undefined) {
    sets.push("is_archived = ?");
    const v =
      typeof patch.is_archived === "boolean"
        ? patch.is_archived
          ? 1
          : 0
        : patch.is_archived;
    args.push(v);
  }

  if (sets.length === 0) {
    return getSegment(slug);
  }

  sets.push("updated_at = datetime('now')");
  args.push(slug);

  const result = await getDb().execute({
    sql: `UPDATE segments SET ${sets.join(", ")} WHERE slug = ? RETURNING *`,
    args,
  });
  if (result.rows.length === 0) return null;
  return rowToSegment(result.rows[0] as Row);
}

export async function archiveSegment(slug: string): Promise<SegmentRow | null> {
  return updateSegment(slug, { is_archived: 1 });
}

export async function unarchiveSegment(slug: string): Promise<SegmentRow | null> {
  return updateSegment(slug, { is_archived: 0 });
}

export async function countLeadsForSegment(slug: string): Promise<number> {
  const result = await getDb().execute({
    sql: "SELECT COUNT(*) AS n FROM leads WHERE segment = ?",
    args: [slug],
  });
  const row = result.rows[0] as Row | undefined;
  return Number(row?.n ?? 0);
}

export async function countTemplatesForSegment(slug: string): Promise<number> {
  const result = await getDb().execute({
    sql: "SELECT COUNT(*) AS n FROM email_templates WHERE segment = ?",
    args: [slug],
  });
  const row = result.rows[0] as Row | undefined;
  return Number(row?.n ?? 0);
}

export async function deleteSegment(slug: string): Promise<boolean> {
  const result = await getDb().execute({
    sql: "DELETE FROM segments WHERE slug = ?",
    args: [slug],
  });
  return (result.rowsAffected ?? 0) > 0;
}

export interface SegmentWithCounts extends SegmentRow {
  lead_count: number;
  template_count: number;
}

export async function listSegmentsWithCounts(): Promise<SegmentWithCounts[]> {
  const result = await getDb().execute({
    sql: `
      SELECT
        s.*,
        COALESCE((SELECT COUNT(*) FROM leads l WHERE l.segment = s.slug), 0) AS lead_count,
        COALESCE((SELECT COUNT(*) FROM email_templates t WHERE t.segment = s.slug), 0) AS template_count
      FROM segments s
      ORDER BY s.is_archived ASC, s.sort_order ASC, s.label_ru ASC
    `,
    args: [],
  });
  return result.rows.map((r) => {
    const row = r as unknown as Row;
    return {
      ...rowToSegment(row),
      lead_count: Number(row.lead_count ?? 0),
      template_count: Number(row.template_count ?? 0),
    };
  });
}
