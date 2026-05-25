import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createClient } from "@libsql/client";

config({ path: ".env.local" });

async function main() {
  const url = process.env.LIBSQL_URL;
  if (!url) {
    console.error("LIBSQL_URL is not set. Put it in .env.local (e.g. LIBSQL_URL=file:local.db).");
    process.exit(1);
  }

  const client = createClient({ url, authToken: process.env.LIBSQL_AUTH_TOKEN });
  const sql = await readFile(resolve(process.cwd(), "src/lib/db/schema.sql"), "utf8");

  await client.executeMultiple(sql);

  console.log(`Migrated schema.sql against ${url}.`);
  client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
