import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/getDb";
import { getNextAction, type NextAction } from "@/lib/pipeline/getNextAction";
import type {
  LeadRow,
  OutreachEventRow,
  LeadStatus,
  Segment,
  EventType,
} from "@/lib/schemas";

export const dynamic = "force-dynamic";

function rowToLead(row: Record<string, unknown>): LeadRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    company: String(row.company),
    email: (row.email as string | null) ?? null,
    website: (row.website as string | null) ?? null,
    country: String(row.country),
    city: (row.city as string | null) ?? null,
    segment: row.segment as Segment,
    source: row.source as LeadRow["source"],
    status: row.status as LeadStatus,
    hook_text: (row.hook_text as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    next_action_due: (row.next_action_due as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function rowToEvent(row: Record<string, unknown>): OutreachEventRow {
  return {
    id: Number(row.id),
    lead_id: Number(row.lead_id),
    type: row.type as EventType,
    happened_at: String(row.happened_at),
    subject: (row.subject as string | null) ?? null,
    body_snippet: (row.body_snippet as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    created_at: String(row.created_at),
  };
}

export interface TodayItem {
  lead: LeadRow;
  next_action: NextAction;
}

export interface TodayResponse {
  overdue: TodayItem[];
  today: TodayItem[];
  soon: TodayItem[];
  all_active: TodayItem[];
}

function sortByDueAscNullsLast(a: TodayItem, b: TodayItem): number {
  const ad = a.next_action.due_date;
  const bd = b.next_action.due_date;
  if (ad === null && bd === null) return 0;
  if (ad === null) return 1;
  if (bd === null) return -1;
  return ad.localeCompare(bd);
}

export async function GET() {
  try {
    const db = getDb();

    const leadsRes = await db.execute({
      sql: "SELECT * FROM leads ORDER BY id ASC",
      args: [],
    });
    const leads: LeadRow[] = leadsRes.rows.map((r) =>
      rowToLead(r as unknown as Record<string, unknown>)
    );

    const eventsRes = await db.execute({
      sql: "SELECT * FROM outreach_events ORDER BY lead_id, happened_at DESC, id DESC",
      args: [],
    });
    const allEvents: OutreachEventRow[] = eventsRes.rows.map((r) =>
      rowToEvent(r as unknown as Record<string, unknown>)
    );

    // Группируем события по lead_id.
    const eventsByLead = new Map<number, OutreachEventRow[]>();
    for (const ev of allEvents) {
      const arr = eventsByLead.get(ev.lead_id);
      if (arr) arr.push(ev);
      else eventsByLead.set(ev.lead_id, [ev]);
    }

    const today = new Date();

    const overdue: TodayItem[] = [];
    const todayList: TodayItem[] = [];
    const soon: TodayItem[] = [];
    const allActive: TodayItem[] = [];

    for (const lead of leads) {
      const evs = eventsByLead.get(lead.id) ?? [];
      const next_action = getNextAction(lead, evs, today);

      if (next_action.action === "done") continue;

      const item: TodayItem = { lead, next_action };
      allActive.push(item);

      if (next_action.urgency === "overdue") overdue.push(item);
      else if (next_action.urgency === "today") todayList.push(item);
      else if (next_action.urgency === "soon") soon.push(item);
    }

    overdue.sort(sortByDueAscNullsLast);
    todayList.sort(sortByDueAscNullsLast);
    soon.sort(sortByDueAscNullsLast);
    allActive.sort(sortByDueAscNullsLast);

    const response: TodayResponse = {
      overdue,
      today: todayList,
      soon,
      all_active: allActive,
    };
    return NextResponse.json(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Неизвестная ошибка";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
