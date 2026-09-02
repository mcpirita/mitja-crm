import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TodayGroup } from "@/components/today/TodayGroup";
import { ActiveLeadsTable } from "@/components/today/ActiveLeadsTable";
import { getDb } from "@/lib/db/getDb";
import { listSegments } from "@/lib/db/segments";
import { getNextAction } from "@/lib/pipeline/getNextAction";
import { PRIORITY_ORDER } from "@/lib/schemas";
import type {
  DealType,
  LeadRow,
  OutreachEventRow,
  LeadStatus,
  Priority,
  Segment,
  EventType,
} from "@/lib/schemas";

export const metadata = {
  title: "Сегодня · Mitja CRM",
};

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
    deal_type: (row.deal_type as DealType) ?? "rent",
    priority: (row.priority as Priority) ?? "medium",
    hook_text: (row.hook_text as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    last_status_raw: (row.last_status_raw as string | null) ?? null,
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

export default async function TodayPage() {
  const db = getDb();
  const segments = await listSegments();

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

  const eventsByLead = new Map<number, OutreachEventRow[]>();
  for (const ev of allEvents) {
    const arr = eventsByLead.get(ev.lead_id);
    if (arr) arr.push(ev);
    else eventsByLead.set(ev.lead_id, [ev]);
  }

  const today = new Date();

  const overdue: { lead: LeadRow; next_action: ReturnType<typeof getNextAction> }[] = [];
  const todayList: typeof overdue = [];
  const soon: typeof overdue = [];
  const allActive: typeof overdue = [];

  for (const lead of leads) {
    const evs = eventsByLead.get(lead.id) ?? [];
    const next_action = getNextAction(lead, evs, today);
    if (next_action.action === "done") continue;

    const item = { lead, next_action };
    allActive.push(item);
    if (next_action.urgency === "overdue") overdue.push(item);
    else if (next_action.urgency === "today") todayList.push(item);
    else if (next_action.urgency === "soon") soon.push(item);
  }

  // Сначала по сроку, затем по приоритету: внутри одного дня (а «Написать
  // первое» валится на сегодня целой пачкой) вверху должен быть «Высокий».
  const sortAsc = (
    a: (typeof overdue)[number],
    b: (typeof overdue)[number]
  ) => {
    const ad = a.next_action.due_date;
    const bd = b.next_action.due_date;
    if (ad !== bd) {
      if (ad === null) return 1;
      if (bd === null) return -1;
      const byDate = ad.localeCompare(bd);
      if (byDate !== 0) return byDate;
    }
    return PRIORITY_ORDER[a.lead.priority] - PRIORITY_ORDER[b.lead.priority];
  };
  overdue.sort(sortAsc);
  todayList.sort(sortAsc);
  soon.sort(sortAsc);
  allActive.sort(sortAsc);

  const isCompletelyEmpty = leads.length === 0;

  return (
    <>
      <PageHeader
        title="Сегодня"
        description="Просроченные касания, сегодняшние, скоро — и таблица всех активных лидов."
      />

      {isCompletelyEmpty ? (
        <EmptyState
          title="Пока пусто"
          description="Очередь касаний появится, когда заведём лидов и события."
        />
      ) : (
        <>
          <TodayGroup
            title="Просрочено"
            items={overdue}
            emptyHint="Ничего не просрочено."
            segments={segments}
          />
          <TodayGroup
            title="На сегодня"
            items={todayList}
            emptyHint="На сегодня дел нет."
            segments={segments}
          />
          <TodayGroup
            title="Скоро"
            items={soon}
            emptyHint="В ближайшие 3 дня ничего не наступает."
            segments={segments}
          />
          <ActiveLeadsTable items={allActive} segments={segments} />
        </>
      )}
    </>
  );
}
