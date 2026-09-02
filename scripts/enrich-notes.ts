/**
 * Дополняет `leads.notes` выжимкой из переписки (data/mail/*.ndjson).
 *
 *   npm run enrich:notes            — только превью в data/mail/notes-preview.json
 *   npm run enrich:notes -- --apply — записать в local.db
 *
 * Статусы, даты и любые другие поля НЕ трогает — пишет только в notes, добавляя
 * блок в конец. Повторный запуск заменяет свой прежний блок, а не плодит копии.
 *
 * Лидам, которым писали, но никто не ответил, выжимка не нужна — там ставится
 * фактическая строка без обращения к модели.
 */
import { readFile, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";

config({ path: ".env.local" });

const ME = "gubin@pforzwald.com";
const TODAY = "2026-09-01";
const MARKER = "── из почты";
const PREVIEW_FILE = "data/mail/notes-preview.json";

// Куда пишем. В режиме --prod заметки читаются и дописываются прямо в проде,
// чтобы не затереть чужие правки устаревшей локальной копией.
const PROD = process.argv.includes("--prod");
const TARGET = PROD
  ? { url: process.env.PROD_LIBSQL_URL ?? "", authToken: process.env.PROD_LIBSQL_AUTH_TOKEN }
  : { url: "file:local.db" };
const CONCURRENCY = 4;

const SYSTEM = `Ты помогаешь владельцу малого бизнеса вести CRM по холодному outreach.
Он сдаёт помещения в Пфорцхайме (кинозал, площади) и продаёт здание целиком.
Пишет по-немецки, лиды отвечают по-немецки.

ВАЖНО: переписка — НЕ вся картина. С частью клиентов говорили по телефону, с
частью общалась коллега Арина, часть просто пропала. Поэтому ты НЕ делаешь
выводов о том, чем всё кончилось и жив ли лид. Ты собираешь справку: кто эти
люди, что за компания, и что они писали — с датами.

На вход — переписка с одним лидом. Верни справку по-русски в таком порядке:

1. Люди. Имена, должности, телефоны, мобильные, WhatsApp, личные email, адрес и
   юрданные компании — всё, что встретилось в письмах и подписях. Дословно.
   Это главное: чтобы через год можно было позвонить, не поднимая почту.
2. Компания. Чем занимаются, где находятся, какие у них сейчас площади, планы,
   что им нужно от помещения, какие требования называли.
3. Что писали. Причина интереса или отказа — с датой и как цитата из письма:
   «в письме от 12.12 написали, что …». Их условия, цифры, сроки, возражения.

Правила:
- Строки начинай с "— ". Без заголовков, ярлыков ("Люди:", "Компания:") и
  вступлений — просто факты. Максимум 6 строк.
- НЕ пересказывай НАШЕ предложение: про здание Zerrennerstraße 35, залы
  150–300 м², высокие потолки, фитнес-студию на этаже, парковку и почту Дмитрий
  знает и без заметки. Исключение — конкретика, названная именно этому лиду:
  ставка в €/м², точный метраж, дата осмотра, что именно им выслали.
- Наши напоминания и follow-up перечислять не надо — только если лид на них
  отреагировал.
- НЕ пиши «отказ», «переписка закрыта», «договорённостей не осталось»,
  «лид мёртвый», «интереса нет» как факт. Только «в письме от <дата> написали,
  что …» — почта может не отражать реальность.
- НЕ оценивай перспективность и не советуй, что делать дальше.
- Немецкие термины (Saal, Miete, Nebenkosten) переводи; названия компаний,
  имена, адреса и номера — не переводи и не сокращай.
- Если в письмах нет ни контактов, ни фактов о компании, ни причин — верни РОВНО
  одну строку и больше ничего: "— из почты полезного нет: <в двух словах>".`;

interface RawMessage {
  id: string;
  conversationId: string;
  subject: string | null;
  sentDateTime: string | null;
  receivedDateTime: string | null;
  isDraft: boolean;
  bodyPreview: string | null;
  folder: string | null;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
}

interface Thread {
  leadId: number;
  company: string;
  addresses: Set<string>;
  outgoing: RawMessage[];
  incoming: RawMessage[];
}

// ── очистка тела письма ───────────────────────────────────────────────────

const QUOTE_MARKERS = [
  /^Am .{5,60}\s+schrieb\b/im,
  /^On .{5,80}\s+wrote:/im,
  /^-{2,}\s*Urspr[üu]ngliche Nachricht/im,
  /^-{2,}\s*Original Message/im,
  /^Von:\s.+\n(Gesendet|Datum):/im,
  /^From:\s.+\n(Sent|Date):/im,
];

function cleanBody(html: string): string {
  let t = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  t = t
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)));
  t = t.replace(/[ \t ]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();

  // отрезаем процитированную историю — она уже есть в других письмах треда
  let cut = t.length;
  for (const re of QUOTE_MARKERS) {
    const m = re.exec(t);
    if (m && m.index < cut) cut = m.index;
  }
  t = t.slice(0, cut).trim();

  // строки-цитаты вида "> ..."
  t = t.split("\n").filter((l) => !/^\s*>/.test(l)).join("\n").trim();

  const LIMIT = 3000;
  return t.length > LIMIT ? `${t.slice(0, LIMIT)}\n[…письмо обрезано]` : t;
}

// ── сборка тредов ─────────────────────────────────────────────────────────

const addr = (x?: { emailAddress?: { address?: string } }) =>
  (x?.emailAddress?.address ?? "").toLowerCase();

async function buildThreads() {
  const db = createClient(TARGET);

  const leads = await db.execute(
    "SELECT id, company, name, email, notes FROM leads",
  );
  const contacts = await db.execute(
    "SELECT lead_id, email FROM lead_contacts WHERE email IS NOT NULL AND email <> ''",
  );

  const byAddress = new Map<string, number>();
  const meta = new Map<number, { company: string; notes: string }>();
  for (const r of leads.rows) {
    const id = Number(r.id);
    meta.set(id, {
      company: String(r.company || r.name || `лид #${id}`),
      notes: String(r.notes ?? ""),
    });
    for (const part of String(r.email ?? "").toLowerCase().split(/[;,\s]+/)) {
      if (part.includes("@")) byAddress.set(part.trim(), id);
    }
  }
  for (const r of contacts.rows) {
    const a = String(r.email).toLowerCase().trim();
    if (a.includes("@") && !byAddress.has(a)) byAddress.set(a, Number(r.lead_id));
  }

  const raw = await readFile("data/mail/messages.ndjson", "utf8");
  const messages: RawMessage[] = raw
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RawMessage);

  const threads = new Map<number, Thread>();
  const touch = (leadId: number) => {
    let t = threads.get(leadId);
    if (!t) {
      t = {
        leadId,
        company: meta.get(leadId)?.company ?? `лид #${leadId}`,
        addresses: new Set(),
        outgoing: [],
        incoming: [],
      };
      threads.set(leadId, t);
    }
    return t;
  };

  for (const m of messages) {
    if (m.isDraft) continue;
    const from = addr(m.from);
    if (from === ME) {
      for (const r of m.toRecipients ?? []) {
        const a = addr(r);
        const id = byAddress.get(a);
        if (id === undefined) continue;
        const t = touch(id);
        t.addresses.add(a);
        t.outgoing.push(m);
      }
    } else {
      const id = byAddress.get(from);
      if (id === undefined) continue;
      const t = touch(id);
      t.addresses.add(from);
      t.incoming.push(m);
    }
  }

  return { db, threads, meta };
}

// ── выжимка ───────────────────────────────────────────────────────────────

const when = (m: RawMessage) => (m.sentDateTime ?? m.receivedDateTime ?? "").slice(0, 10);

function transcript(t: Thread, bodies: Map<string, string>): string {
  const all = [
    ...t.outgoing.map((m) => ({ m, dir: "МЫ" as const })),
    ...t.incoming.map((m) => ({ m, dir: "ОНИ" as const })),
  ].sort((a, b) => when(a.m).localeCompare(when(b.m)));

  return all
    .map(({ m, dir }) => {
      const who = m.from?.emailAddress?.name ?? m.from?.emailAddress?.address ?? "";
      const head = `[${when(m)}] ${dir} (${who}) — тема: ${m.subject ?? "без темы"}`;
      // наши письма — шаблонные, хватает превью; их ответы читаем целиком
      const body =
        dir === "ОНИ"
          ? cleanBody(bodies.get(m.id) ?? m.bodyPreview ?? "")
          : (m.bodyPreview ?? "").trim();
      return `${head}\n${body}`;
    })
    .join("\n\n---\n\n");
}

async function summarize(client: Anthropic, t: Thread, text: string) {
  const res = await client.messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    thinking: { type: "adaptive" },
    output_config: { effort: "medium" },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Компания: ${t.company}\nАдреса: ${[...t.addresses].join(", ")}\n\nПереписка:\n\n${text}`,
      },
    ],
  });
  return res.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Приводит вывод модели к единому виду: без пустых строк между пунктами и
 *  без формулировок, протёкших из промпта. */
function normalize(text: string): string {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/\s*—?\s*конкретика, названная именно этому лиду\.?/gi, ""))
    .filter((l) => l !== "—")
    .join("\n");
}

async function pool<T>(items: T[], n: number, fn: (item: T, i: number) => Promise<void>) {
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(n, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        await fn(items[i], i);
      }
    }),
  );
}

// ── ─────────────────────────────────────────────────────────────────────────

async function main() {
  const apply = process.argv.includes("--apply");
  const regen = process.argv.includes("--regen");
  // --ids=178-252 или --ids=5,7,9 — обработать только эти карточки
  const idsArg = process.argv.find((a) => a.startsWith("--ids="))?.slice(6);
  const idFilter = (() => {
    if (!idsArg) return null;
    const set = new Set<number>();
    for (const part of idsArg.split(",")) {
      const range = /^(\d+)-(\d+)$/.exec(part.trim());
      if (range) {
        for (let i = Number(range[1]); i <= Number(range[2]); i++) set.add(i);
      } else if (part.trim()) set.add(Number(part.trim()));
    }
    return set;
  })();

  if (PROD && !TARGET.url) {
    console.error("Нет PROD_LIBSQL_URL в окружении — прод-запись невозможна.");
    process.exit(1);
  }
  const { db, threads, meta } = await buildThreads();

  // --apply пишет в базу ровно то, что показало превью. Без этого «применить»
  // означало бы второй прогон модели с другим текстом, чем ты утверждал.
  if (apply && !regen) {
    const saved = JSON.parse(
      await readFile(PREVIEW_FILE, "utf8"),
    ) as { leadId: number; company: string; block: string }[];
    let n = 0;
    for (const r of saved) {
      const old = meta.get(r.leadId)?.notes ?? "";
      const base = old.split(MARKER)[0].trimEnd();
      const notes = `${base}${base ? "\n\n" : ""}${MARKER} (${TODAY}) ──\n${r.block}`;
      await db.execute({ sql: "UPDATE leads SET notes = ? WHERE id = ?", args: [notes, r.leadId] });
      n++;
    }
    console.log(
      `Записано в ${PROD ? "ПРОД (Turso)" : "local.db"}: ${n} лидов (только поле notes, из ${PREVIEW_FILE}).`,
    );
    return;
  }

  const bodies = new Map<string, string>();
  for (const line of (await readFile("data/mail/bodies.ndjson", "utf8")).split("\n")) {
    if (!line) continue;
    const b = JSON.parse(line) as { id: string; body: string };
    bodies.set(b.id, b.body);
  }

  const list = [...threads.values()]
    .filter((t) => !idFilter || idFilter.has(t.leadId))
    .sort((a, b) => b.incoming.length - a.incoming.length);
  if (idFilter) console.log(`Фильтр по id: ${idsArg} → подходит лидов: ${list.length}`);
  const withReplies = list.filter((t) => t.incoming.length > 0);
  const silent = list.filter((t) => t.incoming.length === 0);
  console.log(
    `Лидов с перепиской: ${list.length} (с ответами ${withReplies.length}, молчат ${silent.length})`,
  );
  if (!apply) console.log("Режим превью — в базу ничего не пишется.\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const results: { leadId: number; company: string; block: string }[] = [];

  await pool(withReplies, CONCURRENCY, async (t) => {
    const summary = normalize(await summarize(client, t, transcript(t, bodies)));
    results.push({ leadId: t.leadId, company: t.company, block: summary });
    process.stdout.write(`\r  разобрано: ${results.length}/${withReplies.length}`);
  });
  console.log("");

  // молчунам — факты, без модели
  for (const t of silent) {
    const last = t.outgoing.map(when).sort().at(-1) ?? "?";
    const days = Math.round(
      (Date.parse(TODAY) - Date.parse(last)) / 86_400_000,
    );
    results.push({
      leadId: t.leadId,
      company: t.company,
      block: `— писем от нас: ${t.outgoing.length}, последнее ${last} (${days} дн. назад); по почте не ответили (телефон и разговоры Арины здесь не видны)`,
    });
  }

  results.sort((a, b) => a.leadId - b.leadId);
  await writeFile(PREVIEW_FILE, JSON.stringify(results, null, 2));

  for (const r of results) {
    console.log(`\n#${r.leadId} ${r.company}\n${r.block}`);
  }

  if (!apply) {
    console.log(
      `\n\nПревью → data/mail/notes-preview.json (${results.length} лидов).` +
        `\nЗаписать: npm run enrich:notes -- --apply`,
    );
    return;
  }

  let written = 0;
  for (const r of results) {
    const old = meta.get(r.leadId)?.notes ?? "";
    const base = old.split(MARKER)[0].trimEnd(); // свой прежний блок затираем
    const notes = `${base}${base ? "\n\n" : ""}${MARKER} (${TODAY}) ──\n${r.block}`;
    await db.execute({
      sql: "UPDATE leads SET notes = ? WHERE id = ?",
      args: [notes, r.leadId],
    });
    written++;
  }
  console.log(
    `\n\nЗаписано в ${PROD ? "ПРОД (Turso)" : "local.db"}: ${written} лидов (только поле notes).`,
  );
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
