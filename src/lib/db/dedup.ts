import { getDb } from "./getDb";
import { getLead, listLeads } from "./leads";
import type { LeadRow } from "@/lib/schemas";

// Юр. формы и шумовые токены, которые убираем перед сравнением названий.
const COMPANY_SUFFIXES =
  /\b(gmbh|ug|ag|kg|ohg|mbh|co|ltd|inc|llc|gbr|se|ev|haftungsbeschr[aä]nkt)\b/g;

/** Нормализует название компании: нижний регистр, без юр. формы и пунктуации. */
export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(/e\.?\s?v\.?/g, " ")
    .replace(COMPANY_SUFFIXES, " ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenSet(normalized: string): Set<string> {
  return new Set(normalized.split(" ").filter((t) => t.length >= 2));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

export interface DuplicateMatch {
  lead: LeadRow;
  reasons: string[];
}

/**
 * Точные совпадения для предупреждения при создании лида:
 * совпадение email (в leads.email и lead_contacts.email), компании или имени.
 */
export async function findDuplicateLeads(input: {
  email?: string | null;
  company?: string | null;
  name?: string | null;
  excludeId?: number;
}): Promise<DuplicateMatch[]> {
  const db = getDb();
  const reasonsById = new Map<number, Set<string>>();
  const add = (id: number, reason: string) => {
    if (input.excludeId && id === input.excludeId) return;
    const set = reasonsById.get(id) ?? new Set<string>();
    set.add(reason);
    reasonsById.set(id, set);
  };

  const email = input.email?.trim().toLowerCase();
  const company = input.company?.trim().toLowerCase();
  const name = input.name?.trim().toLowerCase();

  if (email) {
    const r1 = await db.execute({
      sql: "SELECT id FROM leads WHERE email IS NOT NULL AND lower(email) = ?",
      args: [email],
    });
    r1.rows.forEach((row) => add(Number(row.id), "совпадает email"));
    const r2 = await db.execute({
      sql: "SELECT lead_id FROM lead_contacts WHERE email IS NOT NULL AND lower(email) = ?",
      args: [email],
    });
    r2.rows.forEach((row) =>
      add(Number(row.lead_id), "совпадает email контакта"),
    );
  }

  if (company) {
    const r = await db.execute({
      sql: "SELECT id FROM leads WHERE lower(company) = ?",
      args: [company],
    });
    r.rows.forEach((row) => add(Number(row.id), "совпадает компания"));
  }

  if (name) {
    const r = await db.execute({
      sql: "SELECT id FROM leads WHERE name != '' AND lower(name) = ?",
      args: [name],
    });
    r.rows.forEach((row) => add(Number(row.id), "совпадает имя контакта"));
    const rc = await db.execute({
      sql: "SELECT lead_id FROM lead_contacts WHERE name != '' AND lower(name) = ?",
      args: [name],
    });
    rc.rows.forEach((row) =>
      add(Number(row.lead_id), "совпадает имя контакта"),
    );
  }

  const matches: DuplicateMatch[] = [];
  for (const [id, reasons] of reasonsById) {
    const lead = await getLead(id);
    if (lead) matches.push({ lead, reasons: [...reasons] });
  }
  return matches;
}

export interface SimilarPair {
  a: LeadRow;
  b: LeadRow;
  score: number;
  reason: string;
}

/**
 * Похожие (но не точные) лиды по всей базе — для страницы обнаружения дублей.
 * Сравниваем нормализованные названия компаний. Объединение — будущая итерация.
 */
export async function findSimilarPairs(threshold = 0.6): Promise<SimilarPair[]> {
  const leads = await listLeads();
  const norm = leads.map((lead) => {
    const n = normalizeCompany(lead.company);
    return { lead, n, tokens: tokenSet(n) };
  });

  const pairs: SimilarPair[] = [];
  for (let i = 0; i < norm.length; i++) {
    for (let j = i + 1; j < norm.length; j++) {
      const A = norm[i];
      const B = norm[j];
      if (!A.n || !B.n) continue;

      let score = 0;
      let reason = "";
      if (A.n === B.n) {
        score = 1;
        reason = "одинаковое название (без юр. формы)";
      } else {
        const js = jaccard(A.tokens, B.tokens);
        if (js >= threshold) {
          score = js;
          reason = "похожее название";
        } else if (
          (A.n.includes(B.n) || B.n.includes(A.n)) &&
          Math.min(A.n.length, B.n.length) >= 4
        ) {
          score = 0.8;
          reason = "одно название входит в другое";
        }
      }

      if (score >= threshold) pairs.push({ a: A.lead, b: B.lead, score, reason });
    }
  }

  pairs.sort((x, y) => y.score - x.score);
  return pairs;
}
