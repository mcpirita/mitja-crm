import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import Papa from "papaparse";
import { parseStatus } from "../src/lib/import/parseStatus";
import type { Segment } from "../src/lib/schemas";
import { SEGMENT_LABELS_RU } from "../src/lib/schemas";

config({ path: ".env.local" });

const SEGMENT_MAP: Record<string, Segment> = {
  "скалодром": "climbing",
  "падель": "padel",
  "пилатес": "pilates",
  "батутный центр": "trampoline",
  "лэйзер тэг": "lasertag",
  "лэйзер таг": "lasertag",
  "лазертаг": "lasertag",
  "comedy club": "comedy",
  "церкови и общины": "church",
  "церкви и общины": "church",
  "боулинг": "bowling",
  "боевые искуства": "martial_arts",
  "боевые искусства": "martial_arts",
  "йога": "yoga",
  "метание топора": "axe_throwing",
  "физитерапефт": "physio",
  "физиотерапевт": "physio",
  "физиотерапия": "physio",
  "exit room": "exit_room",
  "vr": "vr",
  "exit room/vr": "exit_room",
  "танцеваьная студия": "dance",
  "танцевальная студия": "dance",
  "треннинги": "training",
  "тренинги": "training",
  "скейтборд и рампы": "skate",
  "аркада": "arcade",
  "мини гольф": "minigolf",
  "мини-гольф": "minigolf",
  "имерсивные выставки": "immersive",
  "иммерсивные выставки": "immersive",
  "кросс фит": "crossfit",
  "кроссфит": "crossfit",
};

interface CsvRow {
  Номер?: string;
  "Название / описание"?: string;
  "Тип бизеса"?: string;
  Контакт?: string;
  Сайт?: string;
  Статус?: string;
  Почта?: string;
  Премичания?: string;
}

interface PreparedLead {
  rowNumber: string;
  name: string;
  company: string;
  email: string | null;
  website: string | null;
  city: string | null;
  segment: Segment;
  status: string;
  hook_text: string | null;
  notes: string | null;
  last_status_raw: string | null;
  events: { type: string; happened_at: string; source_phrase: string }[];
  detected: string[];
  unparsed_dates: string[];
  warnings: string[];
}

function normalizeSegment(raw: string): { segment: Segment; warning: string | null } {
  const key = raw.trim().toLowerCase();
  if (SEGMENT_MAP[key]) return { segment: SEGMENT_MAP[key], warning: null };
  return { segment: "other", warning: `Неизвестный сегмент: "${raw}" → other` };
}

function normalizeWebsite(raw: string): { website: string | null; sourceHint: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { website: null, sourceHint: null };
  if (/^(https?:\/\/|www\.)/i.test(trimmed)) {
    return { website: trimmed, sourceHint: null };
  }
  return { website: null, sourceHint: `Источник: ${trimmed}` };
}

function deriveName(contact: string, email: string | null, company: string): string {
  const c = contact.trim();
  if (c) return c;
  if (email) {
    const local = email.split("@")[0]?.trim();
    if (local && local.toLowerCase() !== "info" && local.toLowerCase() !== "kontakt") {
      return local;
    }
  }
  return `Контакт не указан (${company.slice(0, 40)})`;
}

function classifyNote(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.includes("@")) return `Доп. контакт: ${trimmed}`;
  return `Доп. инфо: ${trimmed}`;
}

function prepareRow(row: CsvRow, refDate: Date): PreparedLead | null {
  const company = (row["Название / описание"] ?? "").trim();
  if (!company) return null;

  const rowNumber = (row["Номер"] ?? "").trim();
  const contactRaw = (row["Контакт"] ?? "").trim();
  const siteRaw = (row["Сайт"] ?? "").trim();
  const statusRaw = (row["Статус"] ?? "").trim();
  const emailRaw = (row["Почта"] ?? "").trim() || null;
  const noteRaw = (row["Премичания"] ?? "").trim();

  const warnings: string[] = [];

  const segNorm = normalizeSegment((row["Тип бизеса"] ?? "").trim());
  if (segNorm.warning) warnings.push(segNorm.warning);

  const siteNorm = normalizeWebsite(siteRaw);

  const parsed = parseStatus(statusRaw, refDate);

  const notesParts: string[] = [];
  if (siteNorm.sourceHint) notesParts.push(siteNorm.sourceHint);
  const noteClassified = classifyNote(noteRaw);
  if (noteClassified) notesParts.push(noteClassified);

  const name = deriveName(contactRaw, emailRaw, company);

  return {
    rowNumber,
    name,
    company,
    email: emailRaw,
    website: siteNorm.website,
    city: null,
    segment: segNorm.segment,
    status: parsed.status,
    hook_text: null,
    notes: notesParts.length > 0 ? notesParts.join("\n") : null,
    last_status_raw: statusRaw || null,
    events: parsed.events,
    detected: parsed.detected,
    unparsed_dates: parsed.unparsed_dates,
    warnings,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const csvPath = args[0];
  const commit = args.includes("--commit");
  const refDateArg = args.find((a) => a.startsWith("--ref-date="))?.split("=")[1];

  if (!csvPath) {
    console.error("Использование: tsx scripts/import-lumiera.ts <csv-path> [--commit] [--ref-date=YYYY-MM-DD]");
    process.exit(1);
  }

  const refDate = refDateArg ? new Date(refDateArg + "T00:00:00Z") : new Date("2026-05-25T00:00:00Z");

  const url = process.env.LIBSQL_URL;
  if (!url) {
    console.error("LIBSQL_URL не задан в .env.local");
    process.exit(1);
  }

  const raw = await readFile(resolve(csvPath), "utf8");
  const parsed = Papa.parse<CsvRow>(raw, { header: true, skipEmptyLines: true });
  if (parsed.errors.length > 0) {
    console.warn("Папарse warnings:", parsed.errors.slice(0, 3));
  }

  const prepared: PreparedLead[] = [];
  for (const row of parsed.data) {
    const p = prepareRow(row, refDate);
    if (p) prepared.push(p);
  }

  console.log(`\n=== ${commit ? "IMPORT" : "DRY-RUN"} ===`);
  console.log(`CSV: ${csvPath}`);
  console.log(`Reference date: ${refDate.toISOString().slice(0, 10)}`);
  console.log(`Валидных строк: ${prepared.length}\n`);

  const segCount: Record<string, number> = {};
  const statusCount: Record<string, number> = {};
  let totalEvents = 0;
  let warnCount = 0;

  for (const p of prepared) {
    segCount[p.segment] = (segCount[p.segment] ?? 0) + 1;
    statusCount[p.status] = (statusCount[p.status] ?? 0) + 1;
    totalEvents += p.events.length;
    warnCount += p.warnings.length;
  }

  console.log("=== Распределение по сегментам ===");
  for (const [s, n] of Object.entries(segCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(3)} × ${s.padEnd(15)} (${SEGMENT_LABELS_RU[s as Segment] ?? "?"})`);
  }

  console.log("\n=== Распределение по статусам ===");
  for (const [s, n] of Object.entries(statusCount).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${n.toString().padStart(3)} × ${s}`);
  }

  console.log(`\nВсего событий будет создано: ${totalEvents}`);
  console.log(`Предупреждений: ${warnCount}`);

  const showAll = args.includes("--all");
  const rowsToShow = showAll ? prepared : [...prepared.slice(0, 10), ...prepared.slice(-5)];

  console.log(`\n=== ${showAll ? "Все " + prepared.length + " строк" : "Первые 10 + последние 5"} ===`);
  for (const p of rowsToShow) {
    const evt = p.events.map((e) => `${e.type}@${e.happened_at.slice(5)}`).join(", ");
    console.log(`  #${p.rowNumber.padStart(2)} ${p.company.slice(0, 38).padEnd(38)} | ${p.segment.padEnd(13)} | ${p.status.padEnd(22)} | ${evt || "—"}`);
    if (showAll && p.last_status_raw) {
      console.log(`       raw: ${p.last_status_raw.slice(0, 100)}`);
    }
    if (p.warnings.length > 0) console.log(`       ⚠ ${p.warnings.join("; ")}`);
  }

  if (!commit) {
    console.log("\n→ Это dry-run. Для реального импорта добавь флаг --commit");
    return;
  }

  console.log("\n=== Запись в БД ===");
  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });

  let inserted = 0;
  let eventsInserted = 0;
  const errors: { row: string; error: string }[] = [];

  for (const p of prepared) {
    try {
      const leadResult = await client.execute({
        sql: `INSERT INTO leads
          (name, company, email, website, country, city, segment, source, status, hook_text, notes, last_status_raw)
          VALUES (?, ?, ?, ?, 'DE', ?, ?, 'other', ?, ?, ?, ?)
          RETURNING id`,
        args: [
          p.name,
          p.company,
          p.email,
          p.website,
          p.city,
          p.segment,
          p.status,
          p.hook_text,
          p.notes,
          p.last_status_raw,
        ],
      });

      const leadId = Number(leadResult.rows[0]?.id);
      if (!leadId) throw new Error("INSERT не вернул id");
      inserted++;

      for (const ev of p.events) {
        await client.execute({
          sql: `INSERT INTO outreach_events (lead_id, type, happened_at, notes)
                VALUES (?, ?, ?, ?)`,
          args: [
            leadId,
            ev.type,
            `${ev.happened_at} 12:00:00`,
            ev.source_phrase,
          ],
        });
        eventsInserted++;
      }
    } catch (err) {
      errors.push({ row: p.rowNumber, error: err instanceof Error ? err.message : String(err) });
    }
  }

  console.log(`✓ Лидов вставлено: ${inserted}`);
  console.log(`✓ Событий вставлено: ${eventsInserted}`);
  if (errors.length > 0) {
    console.log(`✗ Ошибок: ${errors.length}`);
    for (const e of errors) {
      console.log(`  #${e.row}: ${e.error}`);
    }
  }
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
