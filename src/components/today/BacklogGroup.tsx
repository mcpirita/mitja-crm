"use client";

import { useState } from "react";
import type { SegmentRow } from "@/lib/schemas";
import { TodayCard } from "./TodayCard";
import type { TodayItem } from "./TodayGroup";

const PREVIEW_COUNT = 9;

/**
 * Бэклог первых касаний. Отдельно от очереди по срокам: у этих лидов нет
 * дедлайна, поэтому ни бейджей, ни счётчика просрочки. Показываем горсть
 * карточек, остальное — по кнопке, чтобы 65 компаний не давили простынёй.
 */
export function BacklogGroup({
  title,
  items,
  hint,
  segments,
}: {
  title: string;
  items: TodayItem[];
  hint?: string;
  segments: SegmentRow[];
}) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hidden = items.length - visible.length;

  return (
    <section className="mb-6">
      <h2 className="text-lg font-medium text-zinc-900 mb-1">
        {title} <span className="text-zinc-400 text-sm">({items.length})</span>
      </h2>
      {hint ? <p className="text-sm text-zinc-500 mb-3">{hint}</p> : null}

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((it) => (
          <TodayCard
            key={it.lead.id}
            lead={it.lead}
            nextAction={it.next_action}
            segments={segments}
          />
        ))}
      </div>

      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-sm text-zinc-600 hover:text-zinc-900 underline underline-offset-4"
        >
          {expanded ? "Свернуть" : `Показать все (${items.length})`}
        </button>
      ) : null}
    </section>
  );
}
