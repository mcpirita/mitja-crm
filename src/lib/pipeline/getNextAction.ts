import type { LeadRow, OutreachEventRow, LeadStatus } from "@/lib/schemas";

export type NextActionKind =
  | "send_initial"
  | "send_fup1"
  | "send_fup2"
  | "mark_dead"
  | "awaiting"
  | "done";

/**
 * Насколько действие «горит».
 *
 * Сознательно нет «просрочено»: очередь холодного outreach — это не задачи с
 * дедлайнами, а список того, до чего дошли руки. Красный счётчик просрочки
 * только отпугивает от инструмента (разбор 2026-09-02).
 *
 * - `backlog` — первое касание. Срока нет вообще: не написал сегодня — напишешь
 *   завтра, и ничто от этого не портится.
 * - `due` — по начатой переписке пора сделать следующий шаг (срок наступил,
 *   неважно, сегодня или три недели назад).
 * - `soon` — срок наступит в ближайшие 3 дня.
 * - `later` — позже.
 */
export type Urgency = "backlog" | "due" | "soon" | "later" | null;

export interface NextAction {
  action: NextActionKind;
  due_date: string | null; // ISO 'YYYY-MM-DD'
  urgency: Urgency;
  /** Сколько дней прошло с наступления срока. Только для `due`, иначе null. */
  days_waiting: number | null;
}

// Статусы, которые считаются "закрытыми" — больше касаний не делаем.
const DONE_STATUSES: ReadonlySet<LeadStatus> = new Set<LeadStatus>([
  "won",
  "lost",
  "dead",
  "replied_not_interested",
]);

// Статусы, на которых лид перешёл к ручным стадиям. Автоматически
// ничего не предлагаем — Дмитрий ведёт встречу/просмотр/переговоры сам.
const AWAITING_MANUAL_STATUSES: ReadonlySet<LeadStatus> = new Set<LeadStatus>([
  "replied_interested",
  "replied_later",
  "meeting_scheduled",
  "viewing_done",
  "in_negotiation",
]);

/**
 * Парсит строку формата 'YYYY-MM-DD HH:MM:SS' (UTC, как datetime('now') в sqlite)
 * или ISO 8601 в Date.
 */
function parseHappenedAt(s: string): Date {
  // 'YYYY-MM-DD HH:MM:SS' → 'YYYY-MM-DDTHH:MM:SSZ'
  if (s.includes(" ") && !s.includes("T")) {
    return new Date(s.replace(" ", "T") + "Z");
  }
  // Если уже ISO с зоной — Date парсит нормально.
  return new Date(s);
}

/**
 * YYYY-MM-DD от Date в UTC.
 */
function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Добавляет calendar-дни к дате (в миллисекундах).
 */
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

/** Разница в целых днях между двумя YYYY-MM-DD. */
function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z").getTime();
  const to = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86_400_000);
}

/**
 * Сравнение due и today в виде YYYY-MM-DD-строк.
 * Срок наступил (хоть вчера, хоть месяц назад) → `due`.
 */
function computeUrgency(dueIso: string, todayIso: string): Urgency {
  if (dueIso <= todayIso) return "due";

  // today + 3 (включительно) → soon
  const todayDate = new Date(todayIso + "T00:00:00Z");
  const soonLimit = toIsoDate(addDays(todayDate, 3));
  if (dueIso <= soonLimit) return "soon";

  return "later";
}

function scheduled(
  action: NextActionKind,
  dueIso: string,
  todayIso: string
): NextAction {
  const urgency = computeUrgency(dueIso, todayIso);
  return {
    action,
    due_date: dueIso,
    urgency,
    days_waiting: urgency === "due" ? daysBetween(dueIso, todayIso) : null,
  };
}

function latestOfType(
  events: OutreachEventRow[],
  type: OutreachEventRow["type"]
): OutreachEventRow | null {
  let best: OutreachEventRow | null = null;
  for (const ev of events) {
    if (ev.type !== type) continue;
    if (!best) {
      best = ev;
      continue;
    }
    if (ev.happened_at > best.happened_at) best = ev;
  }
  return best;
}

export function getNextAction(
  lead: LeadRow,
  events: OutreachEventRow[],
  today: Date
): NextAction {
  const todayIso = toIsoDate(today);

  // 1) Закрытые статусы или ответ получен → done.
  if (DONE_STATUSES.has(lead.status)) {
    return { action: "done", due_date: null, urgency: null, days_waiting: null };
  }
  const hasReply = events.some((e) => e.type === "reply_received");
  if (hasReply) {
    return { action: "done", due_date: null, urgency: null, days_waiting: null };
  }

  // 2) Ручные стадии — ничего автоматически.
  if (AWAITING_MANUAL_STATUSES.has(lead.status)) {
    return { action: "awaiting", due_date: null, urgency: null, days_waiting: null };
  }

  // 3) Автоматическая воронка по событиям.
  const emailSent = latestOfType(events, "email_sent");
  const fup1Sent = latestOfType(events, "fup1_sent");
  const fup2Sent = latestOfType(events, "fup2_sent");

  if (!emailSent) {
    // Первого письма нет — это бэклог, а не задача на сегодня. Срока нет.
    return {
      action: "send_initial",
      due_date: null,
      urgency: "backlog",
      days_waiting: null,
    };
  }

  if (!fup1Sent) {
    const due = addDays(parseHappenedAt(emailSent.happened_at), 7);
    return scheduled("send_fup1", toIsoDate(due), todayIso);
  }

  if (!fup2Sent) {
    const due = addDays(parseHappenedAt(fup1Sent.happened_at), 10);
    return scheduled("send_fup2", toIsoDate(due), todayIso);
  }

  // fup2 уже отправлен — через 14 дней пора пометить мёртвым.
  const dueDead = addDays(parseHappenedAt(fup2Sent.happened_at), 14);
  return scheduled("mark_dead", toIsoDate(dueDead), todayIso);
}
