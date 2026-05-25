import { createClient, type Client } from "@libsql/client";

let cached: Client | null = null;

export function getDb(): Client {
  if (cached) return cached;

  const url = process.env.LIBSQL_URL;
  if (!url) {
    throw new Error("LIBSQL_URL is not set. Add it to .env.local (use `file:local.db` for local dev).");
  }

  cached = createClient({
    url,
    authToken: process.env.LIBSQL_AUTH_TOKEN,
  });
  return cached;
}
