/**
 * Выгрузка почты из Microsoft 365 (Outlook Web) через Graph API.
 *
 *   npm run mail:sync                      — метаданные всех писем → data/mail/messages.ndjson
 *   npm run mail:sync -- --since=2026-01-01
 *   npm run mail:sync -- --resume          — продолжить после обрыва
 *   npm run mail:sync -- --bodies          — догрузить тела входящих ответов
 *
 * Вход — device code flow: скрипт печатает код, вы вводите его в браузере под
 * нужным аккаунтом. Refresh-токен ложится в .graph-token.json (в .gitignore),
 * дальше вход не требуется.
 *
 * Требует в .env.local:
 *   MS_CLIENT_ID=<Application (client) ID из Entra>
 *   MS_TENANT_ID=<Directory (tenant) ID>
 */
import { mkdir, readFile, writeFile, appendFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local" });

const CLIENT_ID = process.env.MS_CLIENT_ID;
const TENANT = process.env.MS_TENANT_ID ?? "organizations";
const SCOPE = "offline_access User.Read Mail.Read";
const AUTH = `https://login.microsoftonline.com/${TENANT}/oauth2/v2.0`;
const GRAPH = "https://graph.microsoft.com/v1.0";

const OUT_DIR = "data/mail";
const TOKEN_FILE = ".graph-token.json";
const MESSAGES_FILE = `${OUT_DIR}/messages.ndjson`;
const BODIES_FILE = `${OUT_DIR}/bodies.ndjson`;
const FOLDERS_FILE = `${OUT_DIR}/folders.json`;
const CHECKPOINT_FILE = `${OUT_DIR}/.checkpoint`;

const SELECT = [
  "id",
  "conversationId",
  "internetMessageId",
  "subject",
  "sentDateTime",
  "receivedDateTime",
  "from",
  "sender",
  "toRecipients",
  "ccRecipients",
  "replyTo",
  "isDraft",
  "isRead",
  "hasAttachments",
  "bodyPreview",
  "parentFolderId",
].join(",");

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── аутентификация ────────────────────────────────────────────────────────

interface TokenCache {
  refresh_token: string;
  access_token: string;
  expires_at: number;
}

async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${AUTH}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });
  return { ok: res.ok, data: (await res.json()) as Record<string, string> };
}

async function deviceCodeLogin(): Promise<TokenCache> {
  const res = await fetch(`${AUTH}/devicecode`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: CLIENT_ID!, scope: SCOPE }),
  });
  const flow = (await res.json()) as Record<string, string>;
  if (!res.ok) throw new Error(`devicecode: ${flow.error_description ?? JSON.stringify(flow)}`);

  console.log(`\n  Откройте ${flow.verification_uri}`);
  console.log(`  и введите код: ${flow.user_code}\n`);
  console.log("  Логиньтесь под тем аккаунтом, из которого шёл outreach.\n");

  let interval = Number(flow.interval ?? 5);
  const deadline = Date.now() + Number(flow.expires_in ?? 900) * 1000;

  while (Date.now() < deadline) {
    await sleep(interval * 1000);
    const { ok, data } = await tokenRequest({
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      client_id: CLIENT_ID!,
      device_code: flow.device_code,
    });
    if (ok) return cacheFrom(data);
    if (data.error === "authorization_pending") continue;
    if (data.error === "slow_down") {
      interval += 5;
      continue;
    }
    throw new Error(`вход не удался: ${data.error_description ?? data.error}`);
  }
  throw new Error("код устарел, запустите скрипт заново");
}

function cacheFrom(data: Record<string, string>): TokenCache {
  return {
    refresh_token: data.refresh_token,
    access_token: data.access_token,
    expires_at: Date.now() + Number(data.expires_in) * 1000 - 60_000,
  };
}

let cache: TokenCache | null = null;

async function accessToken(): Promise<string> {
  if (cache && Date.now() < cache.expires_at) return cache.access_token;

  if (!cache && existsSync(TOKEN_FILE)) {
    cache = JSON.parse(await readFile(TOKEN_FILE, "utf8")) as TokenCache;
  }

  if (cache?.refresh_token) {
    const { ok, data } = await tokenRequest({
      grant_type: "refresh_token",
      client_id: CLIENT_ID!,
      refresh_token: cache.refresh_token,
      scope: SCOPE,
    });
    if (ok) cache = cacheFrom(data);
    else {
      console.log(`  refresh-токен протух (${data.error}), нужен повторный вход`);
      cache = await deviceCodeLogin();
    }
  } else {
    cache = await deviceCodeLogin();
  }

  await writeFile(TOKEN_FILE, JSON.stringify(cache, null, 2));
  return cache.access_token;
}

// ── запросы к Graph ───────────────────────────────────────────────────────

async function graph<T>(url: string): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken();
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });

    if (res.ok) return (await res.json()) as T;

    // 429/503 — ждём столько, сколько просит Microsoft
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      const wait = Number(res.headers.get("Retry-After") ?? 2 ** attempt * 5);
      console.log(`  ${res.status}, ждём ${wait}с…`);
      await sleep(wait * 1000);
      continue;
    }
    if (res.status === 401 && attempt < 1) {
      cache = null;
      continue;
    }
    throw new Error(`graph ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
}

interface Page<T> {
  value: T[];
  "@odata.nextLink"?: string;
}

interface Folder {
  id: string;
  displayName: string;
  childFolderCount: number;
}

async function fetchFolders(): Promise<Record<string, string>> {
  const map: Record<string, string> = {};

  async function walk(url: string, prefix: string) {
    let next: string | undefined = url;
    while (next) {
      const page: Page<Folder> = await graph(next);
      for (const f of page.value) {
        const path = prefix ? `${prefix}/${f.displayName}` : f.displayName;
        map[f.id] = path;
        if (f.childFolderCount > 0) {
          await walk(`${GRAPH}/me/mailFolders/${f.id}/childFolders?$top=100`, path);
        }
      }
      next = page["@odata.nextLink"];
    }
  }

  await walk(`${GRAPH}/me/mailFolders?$top=100`, "");
  return map;
}

// ── шаг 1: метаданные всех писем ──────────────────────────────────────────

async function syncMessages(since: string | null, resume: boolean) {
  await mkdir(OUT_DIR, { recursive: true });

  const me = await graph<{ mail: string; userPrincipalName: string }>(`${GRAPH}/me`);
  console.log(`  Ящик: ${me.mail ?? me.userPrincipalName}`);

  const folders = await fetchFolders();
  await writeFile(FOLDERS_FILE, JSON.stringify(folders, null, 2));
  console.log(`  Папок: ${Object.keys(folders).length}`);

  let url: string;
  if (resume && existsSync(CHECKPOINT_FILE)) {
    url = (await readFile(CHECKPOINT_FILE, "utf8")).trim();
    console.log("  Продолжаем с последней контрольной точки");
  } else {
    const params = new URLSearchParams({ $select: SELECT, $top: "200" });
    params.set("$orderby", "receivedDateTime desc");
    if (since) params.set("$filter", `receivedDateTime ge ${since}T00:00:00Z`);
    url = `${GRAPH}/me/messages?${params}`;
    await rm(MESSAGES_FILE, { force: true });
  }

  let total = 0;
  let next: string | undefined = url;
  while (next) {
    const page: Page<Record<string, unknown>> = await graph(next);
    const lines = page.value.map((m) =>
      JSON.stringify({ ...m, folder: folders[m.parentFolderId as string] ?? null }),
    );
    if (lines.length) await appendFile(MESSAGES_FILE, lines.join("\n") + "\n");
    total += page.value.length;
    next = page["@odata.nextLink"];
    if (next) await writeFile(CHECKPOINT_FILE, next);
    process.stdout.write(`\r  Писем выгружено: ${total}`);
  }
  await rm(CHECKPOINT_FILE, { force: true });
  console.log(`\n  Готово → ${MESSAGES_FILE}`);
}

// ── шаг 2: тела входящих ответов ──────────────────────────────────────────

interface StoredMessage {
  id: string;
  conversationId: string;
  from?: { emailAddress?: { address?: string } };
  folder: string | null;
}

async function syncBodies() {
  const me = await graph<{ mail: string; userPrincipalName: string }>(`${GRAPH}/me`);
  const myAddress = (me.mail ?? me.userPrincipalName).toLowerCase();

  const raw = await readFile(MESSAGES_FILE, "utf8");
  const messages: StoredMessage[] = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as StoredMessage);

  const isMine = (m: StoredMessage) =>
    m.from?.emailAddress?.address?.toLowerCase() === myAddress;

  // тела нужны только там, где на наше письмо кто-то ответил
  const myThreads = new Set(messages.filter(isMine).map((m) => m.conversationId));
  const wanted = messages.filter((m) => !isMine(m) && myThreads.has(m.conversationId));

  const already = new Set<string>();
  if (existsSync(BODIES_FILE)) {
    const prev = await readFile(BODIES_FILE, "utf8");
    for (const line of prev.split("\n").filter(Boolean)) {
      already.add((JSON.parse(line) as { id: string }).id);
    }
  }

  const todo = wanted.filter((m) => !already.has(m.id));
  console.log(`  Входящих в наших тредах: ${wanted.length}, качаем: ${todo.length}`);

  let done = 0;
  for (const m of todo) {
    const full = await graph<{ id: string; body: { content: string } }>(
      `${GRAPH}/me/messages/${m.id}?$select=id,body`,
    );
    await appendFile(
      BODIES_FILE,
      JSON.stringify({ id: full.id, body: full.body?.content ?? "" }) + "\n",
    );
    process.stdout.write(`\r  Тел выгружено: ${++done}/${todo.length}`);
  }
  console.log(`\n  Готово → ${BODIES_FILE}`);
}

// ── ─────────────────────────────────────────────────────────────────────────

async function main() {
  if (!CLIENT_ID) {
    console.error("Нет MS_CLIENT_ID в .env.local — сначала зарегистрируйте приложение в Entra.");
    process.exit(1);
  }
  const args = process.argv.slice(2);
  const since = args.find((a) => a.startsWith("--since="))?.split("=")[1] ?? null;

  if (args.includes("--bodies")) await syncBodies();
  else await syncMessages(since, args.includes("--resume"));
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
