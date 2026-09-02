/**
 * Заводит лидов по адресам, которым мы писали, но карточки в CRM нет.
 *
 *   npm run import:mail                    — превью в data/mail/new-leads.json
 *   npm run import:mail -- --apply --prod  — вставка
 *
 * Компанию, контакт, сегмент и город определяет модель по подписям в письмах и
 * домену. Статус всем ставится `new`: почта показывает только один канал связи,
 * реальный статус Дмитрий проставит при переборке.
 */
import { readFile, writeFile } from "node:fs/promises";
import { config } from "dotenv";
import { createClient } from "@libsql/client";
import Anthropic from "@anthropic-ai/sdk";
import { normalizeCompany } from "../src/lib/db/dedup";

config({ path: ".env.local" });

const ME = "gubin@pforzwald.com";
const TODAY = "2026-09-01";
/** Наши собственные и личные ящики — не лиды. */
const INTERNAL = /@pforzwald\.com$|^gubi\.dima@|^lilpirita@/i;

const PROD = process.argv.includes("--prod");
const TARGET = PROD
  ? { url: process.env.PROD_LIBSQL_URL ?? "", authToken: process.env.PROD_LIBSQL_AUTH_TOKEN }
  : { url: "file:local.db" };
const PREVIEW_FILE = "data/mail/new-leads.json";
/** --cached: взять разбор из превью, не обращаясь к модели заново. */
const CACHED = process.argv.includes("--cached");

const SYSTEM = `Ты разбираешь деловую переписку на немецком, чтобы завести карточку в CRM.
Владелец сдаёт помещения в Пфорцхайме и продаёт здание; это его исходящие письма
и ответы получателей.

По переписке определи данные компании-получателя. Верни СТРОГО JSON, без markdown:
{
  "company": "название компании как в подписи или на сайте, без юр. формы если её нет в подписи",
  "name": "имя контактного лица (Имя Фамилия), или \\"\\" если неизвестно",
  "city": "город, или \\"\\"",
  "website": "домен сайта без http, или \\"\\"",
  "segment": "один slug из списка ниже",
  "notes": "2-4 строки через \\n, каждая с \\"— \\": контакты (телефоны, личные email,
             должности), факты о компании, и что писали — с датой и цитатой.
             Не пиши вердиктов вроде \\"отказ\\" или \\"закрыт\\"."
}

Допустимые segment: {{SEGMENTS}}

Если по переписке род деятельности не ясен — ставь "other". Если это маклер,
брокер или посредник по недвижимости — "broker". Инвестор/фонд — "investor_valueadd"
или "investor_family_office". Название компании не выдумывай: если в письмах его нет,
возьми из домена.`;

interface RawMessage {
  id: string;
  subject: string | null;
  sentDateTime: string | null;
  receivedDateTime: string | null;
  isDraft: boolean;
  bodyPreview: string | null;
  from?: { emailAddress?: { address?: string; name?: string } };
  toRecipients?: { emailAddress?: { address?: string } }[];
}

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
  duplicateOf?: { id: number; company: string; reason: string };
  /** Слабое сходство с существующим лидом — решает человек. */
  suspect?: { id: number; company: string; reason: string };
  /** Адреса той же компании, которые станут доп. контактами лида. */
  alsoContacts?: { email: string; name: string }[];
  /** Заполнено, если этот адрес слит в другую карточку. */
  mergedInto?: string;
}

const addr = (x?: { emailAddress?: { address?: string } }) =>
  (x?.emailAddress?.address ?? "").toLowerCase();
const when = (m: RawMessage) => (m.sentDateTime ?? m.receivedDateTime ?? "").slice(0, 10);

function cleanBody(html: string): string {
  const t = html
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<br\s*\/?>|<\/p>|<\/div>|<\/tr>|<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCharCode(Number(d)))
    .replace(/[ \t ]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
  return t.length > 2500 ? `${t.slice(0, 2500)}\n[…обрезано]` : t;
}

/** Ищет существующего лида по домену почты или похожему названию. */
function matchDuplicate(
  p: Proposal,
  existing: { id: number; company: string; domains: Set<string> }[],
): void {
  const dom = domainOf(p.email);
  for (const e of existing) {
    if (dom && e.domains.has(dom)) {
      p.duplicateOf = { id: e.id, company: e.company, reason: `тот же домен ${dom}` };
      return;
    }
  }
  const norm = normalizeCompany(p.company);
  for (const e of existing) {
    if (norm && norm === normalizeCompany(e.company)) {
      p.duplicateOf = { id: e.id, company: e.company, reason: "точное совпадение названия" };
      return;
    }
  }
  let best: { id: number; company: string; score: number } | null = null;
  for (const e of existing) {
    const score = similarity(p.company, e.company);
    if (score >= 0.6 && (!best || score > best.score))
      best = { id: e.id, company: e.company, score };
  }
  if (best) {
    p.duplicateOf = {
      id: best.id,
      company: best.company,
      reason: `похожее название (${best.score.toFixed(2)})`,
    };
    return;
  }
  // один общий редкий токен — на дубль не тянет, но и вслепую заводить нельзя
  for (const e of existing) {
    const [x, y] = [tokens(p.company), tokens(e.company)];
    for (const t of x) {
      if (y.has(t)) {
        p.suspect = { id: e.id, company: e.company, reason: `общий токен «${t}»` };
        return;
      }
    }
  }
}

/** Слияния могут выстроиться в цепочку — сводим к конечной карточке. */
function resolveChains(proposals: Proposal[]): void {
  const byEmail = new Map(proposals.map((p) => [p.email, p]));
  for (const p of proposals) {
    const seen = new Set<string>([p.email]);
    let target = p.mergedInto;
    while (target && byEmail.get(target)?.mergedInto) {
      if (seen.has(target)) break;
      seen.add(target);
      target = byEmail.get(target)!.mergedInto;
    }
    if (target && target !== p.mergedInto) p.mergedInto = target;
  }
}

/** Несколько адресов одной компании — один лид, остальные в доп. контакты. */
function groupByCompany(proposals: Proposal[]): void {
  for (const p of proposals) {
    if (p.duplicateOf) continue;
    for (const q of proposals) {
      if (q === p || q.duplicateOf) continue;
      const same =
        domainOf(p.email) === domainOf(q.email) || similarity(p.company, q.company) >= 0.6;
      // основным делаем адрес с большей перепиской
      if (same && (q.sent > p.sent || (q.sent === p.sent && q.email < p.email))) {
        q.alsoContacts = [...(q.alsoContacts ?? []), { email: p.email, name: p.name }];
        p.mergedInto = q.email;
        break;
      }
    }
  }
}

function tokens(s: string): Set<string> {
  return new Set(normalizeCompany(s).split(" ").filter((t) => t.length >= 3));
}

/**
 * Доля общих токенов: "freestyle academy stuttgart" ~ "freestyle academy" = 0.67.
 * Односложные названия ("DC Services") отбрасываем — один общий токен вроде
 * "services" иначе совпадает с чем угодно.
 */
function similarity(a: string, b: string): number {
  const [x, y] = [tokens(a), tokens(b)];
  if (x.size < 2 || y.size < 2) return 0;
  let inter = 0;
  for (const t of x) if (y.has(t)) inter++;
  if (inter < 2) return 0;
  return inter / Math.min(x.size, y.size);
}

const domainOf = (email: string) => email.split("@")[1]?.toLowerCase() ?? "";

async function main() {
  const apply = process.argv.includes("--apply");
  if (PROD && !TARGET.url) {
    console.error("Нет PROD_LIBSQL_URL в окружении.");
    process.exit(1);
  }
  const db = createClient(TARGET);

  const segRows = await db.execute("SELECT slug FROM segments ORDER BY slug");
  const segments = segRows.rows.map((r) => String(r.slug));

  const leadRows = await db.execute("SELECT id, company, name, email FROM leads");
  const contactRows = await db.execute(
    "SELECT lead_id, email FROM lead_contacts WHERE email IS NOT NULL AND email <> ''",
  );
  const known = new Set<string>();
  const existing: { id: number; company: string; domains: Set<string> }[] = [];
  for (const r of leadRows.rows) {
    const domains = new Set<string>();
    for (const p of String(r.email ?? "").toLowerCase().split(/[;,\s]+/)) {
      if (p.includes("@")) {
        known.add(p.trim());
        domains.add(domainOf(p.trim()));
      }
    }
    existing.push({ id: Number(r.id), company: String(r.company ?? ""), domains });
  }
  for (const r of contactRows.rows) known.add(String(r.email).toLowerCase().trim());

  const messages: RawMessage[] = (await readFile("data/mail/messages.ndjson", "utf8"))
    .split("\n")
    .filter(Boolean)
    .map((l) => JSON.parse(l) as RawMessage);
  const bodies = new Map<string, string>();
  for (const line of (await readFile("data/mail/bodies.ndjson", "utf8")).split("\n")) {
    if (!line) continue;
    const b = JSON.parse(line) as { id: string; body: string };
    bodies.set(b.id, b.body);
  }

  // адреса, которым писали, но карточки нет
  const threads = new Map<string, { out: RawMessage[]; inc: RawMessage[] }>();
  for (const m of messages) {
    if (m.isDraft) continue;
    const from = addr(m.from);
    if (from === ME) {
      for (const r of m.toRecipients ?? []) {
        const a = addr(r);
        if (!a || known.has(a) || INTERNAL.test(a)) continue;
        if (!threads.has(a)) threads.set(a, { out: [], inc: [] });
        threads.get(a)!.out.push(m);
      }
    }
  }
  for (const m of messages) {
    const from = addr(m.from);
    if (from !== ME && threads.has(from)) threads.get(from)!.inc.push(m);
  }

  console.log(`Адресов без карточки: ${threads.size}`);
  if (!apply) console.log("Режим превью — в базу ничего не пишется.\n");

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const system = SYSTEM.replace("{{SEGMENTS}}", segments.join(", "));
  const proposals: Proposal[] = [];

  const entries = [...threads.entries()];
  if (CACHED) {
    entries.length = 0;
    for (const p of JSON.parse(await readFile(PREVIEW_FILE, "utf8")) as Proposal[]) {
      delete p.duplicateOf;
      delete p.suspect;
      delete p.alsoContacts;
      delete p.mergedInto;
      matchDuplicate(p, existing);
      proposals.push(p);
    }
    console.log(`Взято из кэша: ${proposals.length} карточек (модель не вызывалась)`);
  }
  let done = 0;
  await Promise.all(
    Array.from({ length: Math.min(4, entries.length) }, async () => {
      while (entries.length) {
        const entry = entries.shift();
        if (!entry) break;
        const [email, t] = entry;
        const all = [...t.out, ...t.inc].sort((a, b) => when(a).localeCompare(when(b)));
        const text = all
          .map((m) => {
            const dir = addr(m.from) === ME ? "МЫ" : "ОНИ";
            const who = m.from?.emailAddress?.name ?? addr(m.from);
            const body =
              dir === "ОНИ"
                ? cleanBody(bodies.get(m.id) ?? m.bodyPreview ?? "")
                : (m.bodyPreview ?? "").trim();
            return `[${when(m)}] ${dir} (${who}) тема: ${m.subject ?? ""}\n${body}`;
          })
          .join("\n\n---\n\n");

        const res = await client.messages.create({
          model: "claude-opus-5",
          max_tokens: 2000,
          thinking: { type: "adaptive" },
          output_config: { effort: "medium" },
          system,
          messages: [{ role: "user", content: `Адрес получателя: ${email}\n\n${text}` }],
        });
        const raw = res.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("")
          .replace(/^```(?:json)?|```$/gm, "")
          .trim();

        let parsed: Partial<Proposal>;
        try {
          parsed = JSON.parse(raw) as Partial<Proposal>;
        } catch {
          console.error(`\n${email}: модель вернула не-JSON, пропускаю`);
          continue;
        }

        const lastSent = t.out.map(when).sort().at(-1) ?? "";
        const p: Proposal = {
          email,
          company: (parsed.company || email.split("@")[1]).trim(),
          name: (parsed.name ?? "").trim(),
          city: (parsed.city ?? "").trim(),
          website: (parsed.website ?? "").trim(),
          segment: segments.includes(parsed.segment ?? "") ? parsed.segment! : "other",
          notes: (parsed.notes ?? "").trim(),
          sent: t.out.length,
          lastSent,
          replies: t.inc.length,
        };
        matchDuplicate(p, existing);
        proposals.push(p);
        process.stdout.write(`\r  разобрано: ${++done}`);
      }
    }),
  );
  console.log("");

  groupByCompany(proposals);
  resolveChains(proposals);
  proposals.sort((a, b) => a.company.localeCompare(b.company));
  await writeFile(PREVIEW_FILE, JSON.stringify(proposals, null, 2));

  const dups = proposals.filter((p) => p.duplicateOf);
  const merged = proposals.filter((p) => !p.duplicateOf && p.mergedInto);
  const suspects = proposals.filter((p) => !p.duplicateOf && !p.mergedInto && p.suspect);
  const fresh = proposals.filter((p) => !p.duplicateOf && !p.mergedInto && !p.suspect);
  for (const p of fresh) {
    console.log(
      `\n${p.company} [${p.segment}] ${p.city}\n  ${p.email}  ${p.name}  писем ${p.sent}, посл. ${p.lastSent}, ответов ${p.replies}\n${p.notes}`,
    );
  }
  if (suspects.length) {
    console.log(`\n\n=== ПРОВЕРИТЬ РУКАМИ (похоже на существующего лида) ===`);
    for (const p of suspects)
      console.log(
        `  ${p.company} (${p.email})\n      ~ #${p.suspect!.id} ${p.suspect!.company}  [${p.suspect!.reason}]`,
      );
  }
  if (merged.length) {
    console.log(`\n\n=== СЛИТЫ В ОДНУ КАРТОЧКУ (пойдут доп. контактами) ===`);
    for (const p of merged) console.log(`  ${p.email} → карточка ${p.mergedInto}`);
  }
  if (dups.length) {
    console.log(`\n\n=== ПОХОЖИ НА ДУБЛИ (не вставляю) ===`);
    for (const p of dups)
      console.log(
        `  ${p.company} (${p.email})\n      → #${p.duplicateOf!.id} ${p.duplicateOf!.company}  [${p.duplicateOf!.reason}]`,
      );
  }

  if (!apply) {
    console.log(
      `\n\nПревью → ${PREVIEW_FILE}: к заведению ${fresh.length}, слито ${merged.length}, ` +
        `дублей ${dups.length}, на ручную проверку ${suspects.length}.`,
    );
    return;
  }

  let n = 0;
  for (const p of fresh) {
    const notes = `Заведён из почты ${TODAY} (писали, карточки не было).\n${p.notes}`;
    await db.execute({
      sql: `INSERT INTO leads (name, company, email, website, country, city, segment, source, status, notes)
            VALUES (?, ?, ?, ?, 'DE', ?, ?, 'other', 'new', ?)`,
      args: [p.name, p.company, p.email, p.website || null, p.city || null, p.segment, notes],
    });
    n++;
  }
  console.log(`\n\nЗаведено в ${PROD ? "ПРОД (Turso)" : "local.db"}: ${n} лидов.`);
}

main().catch((err) => {
  console.error(`\n${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
