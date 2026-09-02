/**
 * Импорт Käuferliste (покупатели/инвесторы под продажу здания) в CRM.
 *
 *   npx tsx scripts/import-investors.ts               # превью, ничего не пишет
 *   npx tsx scripts/import-investors.ts --apply       # запись в LIBSQL_URL
 *
 * Источник — Lumiera_Kaeuferliste_1.xlsx, лист «Инвесторы».
 * Статусы и даты касаний берутся НЕ из таблицы (там колонки дат пустые),
 * а из выгрузки почты data/mail/messages.ndjson — см. MAIL_FACTS ниже.
 * Скрипт идемпотентен: лид с таким же названием компании пропускается.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { inflateRawSync } from "node:zlib";
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import { normalizeCompany } from "../src/lib/db/dedup";

config({ path: ".env.local" });

const XLSX_PATH = "Lumiera_Kaeuferliste_1.xlsx";
const SHEET = "xl/worksheets/sheet1.xml";

// ─── минимальный распаковщик .xlsx (zip → нужные XML) ────────────────────────

/** Достаёт один файл из zip-архива по имени. Только stored и deflate. */
function readZipEntry(zip: Buffer, name: string): string {
  // Идём от конца: End of Central Directory → Central Directory → записи.
  let eocd = -1;
  for (let i = zip.length - 22; i >= 0; i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Не найден конец central directory");

  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);

  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("Битая central directory");
    const method = zip.readUInt16LE(p + 10);
    const compSize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const localOffset = zip.readUInt32LE(p + 42);
    const entryName = zip.toString("utf8", p + 46, p + 46 + nameLen);

    if (entryName === name) {
      const lNameLen = zip.readUInt16LE(localOffset + 26);
      const lExtraLen = zip.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + lNameLen + lExtraLen;
      const raw = zip.subarray(start, start + compSize);
      return (method === 0 ? raw : inflateRawSync(raw)).toString("utf8");
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`В архиве нет ${name}`);
}

function decodeXml(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, "&");
}

function columnNumber(ref: string): number {
  let n = 0;
  for (const ch of ref) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/** Лист .xlsx → массив строк, каждая строка — массив ячеек по колонкам A, B, C… */
function readSheet(path: string): string[][] {
  const zip = readFileSync(resolve(process.cwd(), path));

  const shared: string[] = [];
  for (const si of readZipEntry(zip, "xl/sharedStrings.xml").matchAll(/<si>([\s\S]*?)<\/si>/g)) {
    let text = "";
    for (const t of si[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) text += decodeXml(t[1]);
    shared.push(text);
  }

  const xml = readZipEntry(zip, SHEET);
  const rows: string[][] = [];
  for (const r of xml.matchAll(/<row[^>]*\sr="(\d+)"[^>]*?(\/>|>([\s\S]*?)<\/row>)/g)) {
    const cells: string[] = [];
    for (const c of (r[3] ?? "").matchAll(
      /<c\s+r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g,
    )) {
      const attrs = c[2] ?? "";
      const inner = c[3] ?? "";
      const type = /\st="([^"]+)"/.exec(attrs)?.[1] ?? "n";
      const v = /<v>([\s\S]*?)<\/v>/.exec(inner)?.[1];

      let value = "";
      if (type === "s" && v) value = shared[Number(v)] ?? "";
      else if (type === "inlineStr") {
        for (const t of inner.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) value += decodeXml(t[1]);
      } else if (v) value = decodeXml(v);

      cells[columnNumber(c[1]) - 1] = value.replace(/\s+/g, " ").trim();
    }
    if (cells.some((x) => x)) rows.push(Array.from(cells, (x) => x ?? ""));
  }
  return rows;
}

// ─── сопоставления ───────────────────────────────────────────────────────────

/**
 * Категория таблицы → сегмент CRM. «Уже отработаны» — это стадия, а не тип
 * покупателя, поэтому её восемь строк разложены по смыслу в CATEGORY_OVERRIDE.
 */
const CATEGORY_TO_SEGMENT: Record<string, string> = {
  "Value-add / проблемные": "investor_valueadd",
  "Self-storage": "self_storage",
  "Фитнес-сети": "fitness_chain",
  Образование: "education",
  "Медицина / MVZ": "medical_mvz",
  "Кинооператоры (покупка)": "cinema_buyer",
  "Местные / город": "local_city",
  "Платформы и базы": "platforms",
  "Фонды / Asset Manager": "fund_asset_manager",
  "Маклеры / брокеры": "broker",
  "Паркинг-инвесторы": "parking_investor",
  "Иностранный капитал": "foreign_capital",
  "Прецеденты: кинообъекты": "cinema_precedent",
  "Отели (по прецеденту)": "hotel",
};

/** Номер строки таблицы → сегмент, для категории «Уже отработаны». */
const SEGMENT_OVERRIDE: Record<number, string> = {
  1: "investor_family_office", // REALIUS — Single Family Office
  2: "investor_valueadd",
  3: "investor_valueadd",
  4: "investor_valueadd",
  5: "investor_valueadd",
  6: "investor_valueadd",
  7: "investor_family_office", // ENDREV / ETC — семейная инвестгруппа
  8: "investor_family_office", // Property-One Family Office
};

const PRIORITY_MAP: Record<string, "high" | "medium" | "low"> = {
  Высокий: "high",
  Средний: "medium",
  Низкий: "low",
};

type EventSeed = { type: string; date: string; subject: string };

/**
 * Факты из data/mail/messages.ndjson (ящик gubin@pforzwald.com).
 * Таблица про эти касания не знает: колонки «Дата отправки» и «Дата ответа»
 * в ней пустые, а у Grundschmiede статус вообще «1. Найти контакт»,
 * хотя письмо ушло 21.08.
 */
const SUBJ_AUG04 = "Verkauf einer Gewerbeimmobilie in Pforzheim";
const SUBJ_AUG21 = "Gewerbeobjekt in der Innenstadt von Pforzheim mit Entwicklungspotenzial";

const MAIL_FACTS: Record<
  number,
  { status: string; email?: string; events: EventSeed[] }
> = {
  1: {
    status: "replied_not_interested",
    events: [
      { type: "email_sent", date: "2026-08-04", subject: SUBJ_AUG04 },
      { type: "reply_received", date: "2026-08-04", subject: "AW: " + SUBJ_AUG04 },
      { type: "email_sent", date: "2026-08-07", subject: "Re: " + SUBJ_AUG04 },
    ],
  },
  2: {
    status: "replied_not_interested",
    events: [
      { type: "email_sent", date: "2026-08-04", subject: SUBJ_AUG04 },
      { type: "reply_received", date: "2026-08-05", subject: "Re: " + SUBJ_AUG04 },
      { type: "email_sent", date: "2026-08-07", subject: "Re: " + SUBJ_AUG04 },
    ],
  },
  3: { status: "fup1_sent", events: fupPair() },
  4: { status: "fup1_sent", events: fupPair() },
  5: { status: "fup1_sent", events: fupPair() },
  6: {
    status: "contacted",
    events: [{ type: "email_sent", date: "2026-08-07", subject: SUBJ_AUG04 }],
  },
  7: { status: "fup1_sent", events: fupPair() },
  8: { status: "fup1_sent", events: fupPair() },
  9: {
    status: "contacted",
    events: [{ type: "email_sent", date: "2026-08-21", subject: SUBJ_AUG21 }],
  },
  10: {
    status: "contacted",
    email: "kontakt@grundschmiede.de", // в таблице пусто, адрес взят из почты
    events: [{ type: "email_sent", date: "2026-08-21", subject: SUBJ_AUG21 }],
  },
};

function fupPair(): EventSeed[] {
  return [
    { type: "email_sent", date: "2026-08-04", subject: SUBJ_AUG04 },
    { type: "fup1_sent", date: "2026-08-07", subject: "Re: " + SUBJ_AUG04 },
  ];
}

/** Слова, по которым видно, что в колонке контакта не имя, а должность. */
const ROLE_WORDS =
  /expansion|ankauf|develop|real estate|immobilien|franchise|kanzler|liegenschaften|standort|partner|capital|markets|investment|gewerbe|transaktion|vorstand|geschäftsführer|франчайзи|региона/i;

/**
 * Колонка «Контактное лицо / должность» смешивает имена и роли.
 * Возвращает имя (если это имя) и остаток, который уедет в заметки.
 */
function splitContact(raw: string): { name: string; note: string } {
  if (!raw) return { name: "", note: "" };
  const [head, ...rest] = raw.split(",").map((s) => s.trim());
  const tail = rest.join(", ");

  const looksLikeName =
    !ROLE_WORDS.test(head) &&
    !head.includes("/") &&
    !/\d/.test(head) &&
    /^[\p{Lu}][\p{L}.-]+(\s+[\p{Lu}][\p{L}.-]+)*$/u.test(head);

  if (looksLikeName) return { name: head, note: tail };
  return { name: "", note: raw };
}

function countryFor(region: string): string {
  if (region.startsWith("Бельгия")) return "BE";
  if (region.startsWith("Швейцария")) return "CH";
  return "DE";
}

// ─── сборка лидов ────────────────────────────────────────────────────────────

interface Seed {
  no: number;
  company: string;
  name: string;
  email: string | null;
  website: string | null;
  country: string;
  city: string | null;
  segment: string;
  status: string;
  priority: "high" | "medium" | "low";
  hook_text: string | null;
  notes: string;
  last_status_raw: string;
  events: EventSeed[];
}

function buildSeeds(): Seed[] {
  const rows = readSheet(XLSX_PATH);
  const seeds: Seed[] = [];

  for (const cells of rows.slice(1)) {
    const [noRaw, category, company, why, region, site, email, contact, channel, priority, statusRaw, , , comment] =
      cells.map((c) => c ?? "");
    if (!company) continue;

    const no = Number(noRaw);
    const mail = MAIL_FACTS[no];
    const { name, note: contactNote } = splitContact(contact);

    const notes = [
      `Käuferliste 01.09.2026, строка №${no}. Категория: ${category}.`,
      channel ? `Канал: ${channel}.` : "",
      contactNote ? `Кого искать: ${contactNote}` : "",
      comment ? `Комментарий из таблицы: ${comment}` : "",
      mail ? "Статус и даты касаний восстановлены из почты gubin@pforzwald.com." : "",
    ]
      .filter(Boolean)
      .join("\n");

    seeds.push({
      no,
      company,
      name,
      email: mail?.email ?? (email || null),
      website: site || null,
      country: countryFor(region),
      city: region || null,
      segment: SEGMENT_OVERRIDE[no] ?? CATEGORY_TO_SEGMENT[category] ?? "other",
      status: mail?.status ?? "new",
      priority: PRIORITY_MAP[priority] ?? "medium",
      hook_text: why || null,
      notes,
      last_status_raw: statusRaw,
      events: mail?.events ?? [],
    });
  }

  return seeds;
}

// ─── запись ──────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const url = process.env.LIBSQL_URL;
  if (!url) {
    console.error("LIBSQL_URL не задан (.env.local).");
    process.exit(1);
  }

  const seeds = buildSeeds();
  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });

  const existing = await client.execute({ sql: "SELECT company, email FROM leads", args: [] });
  const byCompany = new Set(existing.rows.map((r) => normalizeCompany(String(r.company))));
  const byEmail = new Set(
    existing.rows.map((r) => String(r.email ?? "").toLowerCase()).filter(Boolean),
  );

  const fresh = seeds.filter((s) => {
    const dupCompany = byCompany.has(normalizeCompany(s.company));
    const dupEmail = s.email ? byEmail.has(s.email.toLowerCase()) : false;
    if (dupCompany || dupEmail) {
      console.log(`  пропуск №${s.no} ${s.company} — уже в базе (${dupCompany ? "компания" : "email"})`);
      return false;
    }
    return true;
  });

  const bySegment = new Map<string, number>();
  const byStatus = new Map<string, number>();
  for (const s of fresh) {
    bySegment.set(s.segment, (bySegment.get(s.segment) ?? 0) + 1);
    byStatus.set(s.status, (byStatus.get(s.status) ?? 0) + 1);
  }

  console.log(`\nК импорту: ${fresh.length} из ${seeds.length}`);
  console.log("По сегментам:", Object.fromEntries([...bySegment].sort()));
  console.log("По статусам:", Object.fromEntries([...byStatus].sort()));
  console.log(`Событий из почты: ${fresh.reduce((n, s) => n + s.events.length, 0)}`);
  console.log(`С email: ${fresh.filter((s) => s.email).length}, с сайтом: ${fresh.filter((s) => s.website).length}`);

  if (!apply) {
    console.log("\nПревью. Для записи запусти с --apply.");
    client.close();
    return;
  }

  let leadsInserted = 0;
  let eventsInserted = 0;

  for (const s of fresh) {
    const res = await client.execute({
      sql: `INSERT INTO leads
        (name, company, email, website, country, city, segment, source, status,
         deal_type, priority, hook_text, notes, last_status_raw)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'other', ?, 'sale', ?, ?, ?, ?)
        RETURNING id`,
      args: [
        s.name,
        s.company,
        s.email,
        s.website,
        s.country,
        s.city,
        s.segment,
        s.status,
        s.priority,
        s.hook_text,
        s.notes,
        s.last_status_raw,
      ],
    });
    const leadId = Number(res.rows[0].id);
    leadsInserted++;

    for (const ev of s.events) {
      await client.execute({
        sql: `INSERT INTO outreach_events (lead_id, type, happened_at, subject, notes)
              VALUES (?, ?, ?, ?, ?)`,
        args: [
          leadId,
          ev.type,
          `${ev.date} 09:00:00`,
          ev.subject,
          "Восстановлено из выгрузки Microsoft 365 (data/mail), 2026-09-01.",
        ],
      });
      eventsInserted++;
    }
  }

  console.log(`\nЗаписано: ${leadsInserted} лидов, ${eventsInserted} событий в ${url}.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
