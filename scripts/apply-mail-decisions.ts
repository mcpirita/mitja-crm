/**
 * Применяет решения Дмитрия (2026-09-02) по адресам из почты без карточек.
 *
 *   npm run mail:decisions              — превью
 *   npm run mail:decisions -- --apply --prod
 *
 * Разбор лежит в data/mail/new-leads.json (см. scripts/import-from-mail.ts).
 */
import { readFile } from "node:fs/promises";
import { config } from "dotenv";
import { createClient } from "@libsql/client";

config({ path: ".env.local" });

const PROD = process.argv.includes("--prod");
const TARGET = PROD
  ? { url: process.env.PROD_LIBSQL_URL ?? "", authToken: process.env.PROD_LIBSQL_AUTH_TOKEN }
  : { url: "file:local.db" };
const TODAY = "2026-09-02";

/** Завести карточку. Статус — со слов Дмитрия, не из почты. */
const CREATE: { email: string; status: string; why: string }[] = [
  {
    email: "agit.mutlu@mailbox.org",
    status: "replied_not_interested",
    why: "гастро-концепт: как клиент подходит, но помещение не подошло (со слов Дмитрия 02.09.2026)",
  },
  {
    email: "tanja.spiekermann@jumphouse.de",
    status: "replied_not_interested",
    why: "нужна площадь >2500 м² и потолки >7 м — наши залы меньше",
  },
];

/** Прицепить доп. контактом к существующему лиду. */
const ATTACH: { email: string; leadId: number; role: string }[] = [
  { email: "bischoffkai@aol.com", leadId: 8, role: "1. Vorsitzender" },
  { email: "jonas.mittelholz@dav-heilbronn.de", leadId: 4, role: "Betriebsleiter" },
  { email: "brittadarmstaedter@cinestar.de", leadId: 168, role: "Assistenz der Geschäftsführung" },
  { email: "gaesteservice@cinestar.de", leadId: 168, role: "Gästeservice" },
  { email: "info@cinestar.de", leadId: 168, role: "общий ящик" },
];

/** Не лиды — не заводим вовсе. */
const SKIP: Record<string, string> = {
  "shemshadian@cinemoon.de": "действующий арендатор Saal 1, не лид",
  "m.geiser@archge.de": "подрядчик-проектировщик",
  "info@guruproject.ee": "подрядчик-проектировщик",
  "ivo@guruprojekt.ee": "подрядчик-проектировщик",
  "ranleo@gmx.de": "личность не установлена",
  "daniel@neo.de.com": "падел в здании технически невозможен",
};

interface Proposal {
  email: string;
  company: string;
  name: string;
  city: string;
  website: string;
  segment: string;
  notes: string;
  sent: number;
  lastSent: string;
  replies: number;
}

async function main() {
  const apply = process.argv.includes("--apply");
  if (PROD && !TARGET.url) {
    console.error("Нет PROD_LIBSQL_URL в окружении.");
    process.exit(1);
  }
  const db = createClient(TARGET);
  const all = JSON.parse(await readFile("data/mail/new-leads.json", "utf8")) as Proposal[];
  const byEmail = new Map(all.map((p) => [p.email, p]));

  console.log(apply ? `Пишу в ${PROD ? "ПРОД" : "local.db"}\n` : "Режим превью\n");

  console.log("=== ЗАВОДИМ ===");
  for (const c of CREATE) {
    const p = byEmail.get(c.email);
    if (!p) {
      console.error(`  ${c.email}: нет в разборе, пропускаю`);
      continue;
    }
    console.log(`  ${p.company} [${p.segment}] ${p.city} — ${c.status}\n    ${p.email} ${p.name}`);
    if (!apply) continue;
    const notes = `Заведён из почты ${TODAY}: писали, карточки не было.\n— ${c.why}\n${p.notes}`;
    await db.execute({
      sql: `INSERT INTO leads (name, company, email, website, country, city, segment, source, status, notes)
            VALUES (?, ?, ?, ?, 'DE', ?, ?, 'other', ?, ?)`,
      args: [p.name, p.company, p.email, p.website || null, p.city || null, p.segment, c.status, notes],
    });
  }

  console.log("\n=== ЦЕПЛЯЕМ КОНТАКТАМИ ===");
  for (const a of ATTACH) {
    const p = byEmail.get(a.email);
    const lead = await db.execute({ sql: "SELECT company FROM leads WHERE id = ?", args: [a.leadId] });
    const company = String(lead.rows[0]?.company ?? "???");
    console.log(`  ${a.email} (${p?.name || "—"}) → #${a.leadId} ${company}`);
    if (!apply) continue;
    const dup = await db.execute({
      sql: "SELECT id FROM lead_contacts WHERE lead_id = ? AND lower(email) = lower(?)",
      args: [a.leadId, a.email],
    });
    if (dup.rows.length) {
      console.log("    уже есть, пропускаю");
      continue;
    }
    await db.execute({
      sql: "INSERT INTO lead_contacts (lead_id, name, email, role, notes) VALUES (?, ?, ?, ?, ?)",
      args: [a.leadId, p?.name ?? "", a.email, a.role, `Из почты ${TODAY}.\n${p?.notes ?? ""}`],
    });
  }

  console.log("\n=== НЕ ЗАВОДИМ ===");
  for (const [email, why] of Object.entries(SKIP)) console.log(`  ${email} — ${why}`);

  if (!apply) console.log("\nПрименить: npm run mail:decisions -- --apply --prod");
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
