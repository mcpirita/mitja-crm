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
      <section className="mb-6">
        <h2 className="text-lg font-medium text-zinc-900 mb-2">
          {title} <span className="text-zinc-400 text-sm">(0)</span>
        </h2>
        {emptyHint ? (
          <div className="text-sm text-zinc-500 rounded-md border border-dashed border-zinc-200 bg-white p-4">
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
    <section className="mb-6">
      <h2 className="text-lg font-medium text-zinc-900 mb-3">
        {title}{" "}
        <span className="text-zinc-400 text-sm">({items.length})</span>
      </h2>
      <div className="space-y-4">
        {orderedActions.map((action) => {
          const list = byAction.get(action) ?? [];
          return (
            <div key={action}>
              <h3 className="text-sm font-medium text-zinc-700 mb-2">
                {ACTION_LABELS[action]}{" "}
                <span className="text-zinc-400">({list.length})</span>
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
