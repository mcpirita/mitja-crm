import type { LeadRow, SegmentRow } from "@/lib/schemas";
import type { NextAction, NextActionKind } from "@/lib/pipeline/getNextAction";
import { TodayCard } from "./TodayCard";

export interface TodayItem {
  lead: LeadRow;
  next_action: NextAction;
}

const ACTION_LABELS: Record<NextActionKind, string> = {
  send_initial: "Новые контакты",
  send_fup1: "Фоллоуап 1",
  send_fup2: "Фоллоуап 2",
  mark_dead: "Пометить мёртвым",
  awaiting: "Ждём",
  done: "Готово",
};

// Порядок групп внутри секции.
const ACTION_ORDER: NextActionKind[] = [
  "send_initial",
  "send_fup1",
  "send_fup2",
  "mark_dead",
  "awaiting",
];

/** Заголовок секции: подпись · линия · счётчик. */
export function SectionHead({
  title,
  count,
  index,
}: {
  title: string;
  count: number;
  index?: string;
}) {
  return (
    <div className="sec">
      {index ? <span className="cap cap-amber">{index}</span> : null}
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-[.24em] text-[var(--dim)]">
        {title}
      </h2>
      <span className="rule" />
      <span className="font-mono text-[11px] text-[var(--dimmer)]">
        {String(count).padStart(2, "0")}
      </span>
    </div>
  );
}

export function TodayGroup({
  title,
  items,
  emptyHint,
  segments,
}: {
  title: string;
  items: TodayItem[];
  emptyHint?: string;
  segments: SegmentRow[];
}) {
  if (items.length === 0) {
    return (
      <section className="rise mb-8">
        <SectionHead title={title} count={0} />
        {emptyHint ? (
          <div className="rounded-[3px] border border-dashed border-[var(--line)] px-4 py-3.5 text-[13px] text-[var(--dimmer)] italic">
            {emptyHint}
          </div>
        ) : null}
      </section>
    );
  }

  // Группировка по типу действия.
  const byAction = new Map<NextActionKind, TodayItem[]>();
  for (const item of items) {
    const key = item.next_action.action;
    const arr = byAction.get(key);
    if (arr) arr.push(item);
    else byAction.set(key, [item]);
  }

  const orderedActions = ACTION_ORDER.filter((a) => byAction.has(a));

  return (
    <section className="rise mb-8">
      <SectionHead title={title} count={items.length} />
      <div className="space-y-5">
        {orderedActions.map((action) => {
          const list = byAction.get(action) ?? [];
          return (
            <div key={action}>
              <h3 className="cap mb-2.5 flex items-center gap-2 text-[9.5px]">
                <span className="text-[var(--dim)]">{ACTION_LABELS[action]}</span>
                <span>·</span>
                <span>{list.length}</span>
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((it) => (
                  <TodayCard
                    key={it.lead.id}
                    lead={it.lead}
                    nextAction={it.next_action}
                    segments={segments}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
