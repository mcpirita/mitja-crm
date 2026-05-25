import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient, type Client } from "@libsql/client";

config({ path: ".env.local" });

async function maybeRebuildLeads(client: Client): Promise<boolean> {
  const r = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='leads'",
    args: [],
  });
  const sqlText = String(r.rows[0]?.sql ?? "");
  if (!sqlText.includes("CHECK (segment IN")) return false;

  const statements = [
    "PRAGMA foreign_keys=OFF",
    `CREATE TABLE leads_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        company TEXT NOT NULL,
        email TEXT,
        website TEXT,
        country TEXT NOT NULL DEFAULT 'DE',
        city TEXT,
        segment TEXT NOT NULL,
        source TEXT NOT NULL DEFAULT 'other' CHECK (source IN ('linkedin', 'google', 'catalog', 'referral', 'other')),
        status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
            'new','contacted','awaiting_reply','fup1_sent','fup2_sent',
            'replied_interested','replied_not_interested','replied_later',
            'meeting_scheduled','viewing_done','in_negotiation','won','lost','dead'
        )),
        hook_text TEXT,
        notes TEXT,
        last_status_raw TEXT,
        next_action_due TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    "INSERT INTO leads_new SELECT * FROM leads",
    "DROP TABLE leads",
    "ALTER TABLE leads_new RENAME TO leads",
    "CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)",
    "CREATE INDEX IF NOT EXISTS idx_leads_segment ON leads(segment)",
    "CREATE INDEX IF NOT EXISTS idx_leads_next_action_due ON leads(next_action_due)",
    "PRAGMA foreign_keys=ON",
  ];

  for (const sql of statements) {
    await client.execute({ sql, args: [] });
  }

  console.log("Rebuilt leads to drop segment CHECK constraint.");
  return true;
}

async function maybeRebuildTemplates(client: Client): Promise<boolean> {
  const r = await client.execute({
    sql: "SELECT sql FROM sqlite_master WHERE type='table' AND name='email_templates'",
    args: [],
  });
  const sqlText = String(r.rows[0]?.sql ?? "");
  if (!sqlText.includes("CHECK (segment IN")) return false;

  const statements = [
    "PRAGMA foreign_keys=OFF",
    `CREATE TABLE email_templates_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        language TEXT NOT NULL DEFAULT 'ru' CHECK (language IN ('ru', 'de', 'en')),
        segment TEXT NOT NULL,
        kind TEXT NOT NULL CHECK (kind IN ('initial', 'fup1', 'fup2')),
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    "INSERT INTO email_templates_new (id, name, language, segment, kind, subject, body, created_at, updated_at) " +
      "SELECT id, name, language, segment, kind, subject, body, created_at, updated_at FROM email_templates",
    "DROP TABLE email_templates",
    "ALTER TABLE email_templates_new RENAME TO email_templates",
    "CREATE INDEX IF NOT EXISTS idx_templates_segment_kind ON email_templates(segment, kind)",
    "PRAGMA foreign_keys=ON",
  ];

  for (const sql of statements) {
    await client.execute({ sql, args: [] });
  }

  console.log("Rebuilt email_templates to drop segment CHECK constraint.");
  return true;
}

async function main() {
  const url = process.env.LIBSQL_URL;
  if (!url) {
    console.error("LIBSQL_URL is not set. Put it in .env.local (e.g. LIBSQL_URL=file:local.db).");
    process.exit(1);
  }

  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });

  // Сначала пересоберём существующие таблицы, чтобы убрать CHECK constraints
  // по segment (если они есть). После этого применим актуальную схему,
  // включающую новую таблицу segments и сиды.
  await maybeRebuildLeads(client);
  await maybeRebuildTemplates(client);

  const sql = await readFile(resolve(process.cwd(), "src/lib/db/schema.sql"), "utf8");
  await client.executeMultiple(sql);

  console.log(`Migrated schema.sql against ${url}.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
