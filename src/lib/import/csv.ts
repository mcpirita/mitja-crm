import Papa from "papaparse";
import { LeadCreate } from "@/lib/schemas";

/**
 * Поля лида, которые можно сопоставить из CSV.
 * Остальные поля схемы (country, source, website, notes) на старте
 * не маппим из импорта — пусть подставляются дефолты схемы.
 */
export const IMPORTABLE_FIELDS = [
  "name",
  "company",
  "email",
  "segment",
  "status",
  "city",
  "hook_text",
] as const;

export type ImportableField = (typeof IMPORTABLE_FIELDS)[number];

export type ColumnMapping = Partial<Record<ImportableField, string | null>>;

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

export interface ValidationError {
  row_index: number;
  message: string;
}

export interface ValidationResult {
  valid: LeadCreate[];
  errors: ValidationError[];
}

/** Парсит CSV-текст через papaparse. Заголовки берутся из первой строки. */
export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = (result.data ?? []).filter((r) => r && typeof r === "object");
  const headers = result.meta?.fields ?? (rows[0] ? Object.keys(rows[0]) : []);

  return { headers, rows };
}

/** Авто-сопоставление колонок: точное совпадение имени target ↔ header. */
export function autoMap(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const lower = new Map(headers.map((h) => [h.toLowerCase().trim(), h]));

  for (const field of IMPORTABLE_FIELDS) {
    const exact = lower.get(field.toLowerCase());
    if (exact) {
      mapping[field] = exact;
    } else {
      mapping[field] = null;
    }
  }

  return mapping;
}

/**
 * Применяет маппинг к строкам — возвращает массив частично-заполненных
 * объектов с ключами IMPORTABLE_FIELDS. Пустые строки превращаются в undefined,
 * чтобы zod-defaults и optional/nullable отработали корректно.
 */
export function mapRows(
  rows: Record<string, string>[],
  mapping: ColumnMapping
): Record<string, string | undefined>[] {
  return rows.map((row) => {
    const out: Record<string, string | undefined> = {};
    for (const field of IMPORTABLE_FIELDS) {
      const column = mapping[field];
      if (!column) continue;
      const raw = row[column];
      const trimmed = typeof raw === "string" ? raw.trim() : "";
      out[field] = trimmed.length > 0 ? trimmed : undefined;
    }
    return out;
  });
}

/**
 * Валидация массива «сырых» строк через LeadCreate.safeParse.
 * Возвращает валидные строки (с применёнными zod-defaults) и список ошибок.
 */
export function validateRows(
  mapped: Record<string, string | undefined>[]
): ValidationResult {
  const valid: LeadCreate[] = [];
  const errors: ValidationError[] = [];

  mapped.forEach((row, index) => {
    const parsed = LeadCreate.safeParse(row);
    if (parsed.success) {
      valid.push(parsed.data);
    } else {
      const message = parsed.error.issues
        .map((i) => {
          const path = i.path.join(".") || "(row)";
          return `${path}: ${i.message}`;
        })
        .join("; ");
      errors.push({ row_index: index, message });
    }
  });

  return { valid, errors };
}
