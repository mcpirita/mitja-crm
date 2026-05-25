"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeadRow, LeadStatus, SegmentRow } from "@/lib/schemas";
import { LEAD_STATUSES, LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import type { NextAction, NextActionKind } from "@/lib/pipeline/getNextAction";

export interface ActiveLeadItem {
  lead: LeadRow;
  next_action: NextAction;
}

const ACTION_LABELS: Record<NextActionKind, string> = {
  send_initial: "Новый контакт",
  send_fup1: "Фоллоуап 1",
  send_fup2: "Фоллоуап 2",
  mark_dead: "Пометить мёртвым",
  awaiting: "Ждём",
  done: "Готово",
};

const URGENCY_LABELS: Record<string, string> = {
  overdue: "просрочено",
  today: "сегодня",
  soon: "скоро",
  later: "позже",
};

const URGENCY_TEXT_CLASS: Record<string, string> = {
  overdue: "text-red-700",
  today: "text-amber-700",
  soon: "text-blue-700",
  later: "text-zinc-500",
};

export function ActiveLeadsTable({
  items,
  segments,
}: {
  items: ActiveLeadItem[];
  segments: SegmentRow[];
}) {
  const [segment, setSegment] = useState<string>("");
  const [status, setStatus] = useState<LeadStatus | "">("");

  const segmentLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of segments) map.set(s.slug, s.label_ru);
    return (slug: string) => map.get(slug) ?? slug;
  }, [segments]);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (segment && it.lead.segment !== segment) return false;
      if (status && it.lead.status !== status) return false;
      return true;
    });
  }, [items, segment, status]);

  return (
    <section>
      <h2 className="text-lg font-medium text-zinc-900 mb-3">
        Все активные{" "}
        <span className="text-zinc-400 text-sm">({filtered.length})</span>
      </h2>

      <div className="flex flex-wrap gap-3 mb-3">
        <label className="text-sm text-zinc-700 flex items-center gap-2">
          <span>Сегмент:</span>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="border border-zinc-300 bg-white rounded-md px-2 py-1 text-sm"
          >
            <option value="">Все</option>
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label_ru}
              </option>
            ))}
          </select>
        </label>

        <label className="text-sm text-zinc-700 flex items-center gap-2">
          <span>Статус:</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
            className="border border-zinc-300 bg-white rounded-md px-2 py-1 text-sm"
          >
            <option value="">Все</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS_RU[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-zinc-200 bg-white p-6 text-center text-sm text-zinc-500">
          Ничего не найдено.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-zinc-50 text-zinc-600">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Компания</th>
                <th className="text-left px-3 py-2 font-medium">Сегмент</th>
                <th className="text-left px-3 py-2 font-medium">Статус</th>
                <th className="text-left px-3 py-2 font-medium">Действие</th>
                <th className="text-left px-3 py-2 font-medium">Срок</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it) => {
                const urg = it.next_action.urgency;
                const urgClass =
                  urg && URGENCY_TEXT_CLASS[urg]
                    ? URGENCY_TEXT_CLASS[urg]
                    : "text-zinc-500";
                return (
                  <tr
                    key={it.lead.id}
                    className="border-t border-zinc-100 hover:bg-zinc-50"
                  >
                    <td className="px-3 py-2">
                      <Link
                        href={`/leads/${it.lead.id}`}
                        className="text-zinc-900 hover:underline"
                      >
                        {it.lead.company}
                      </Link>
                      {it.lead.name ? (
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {it.lead.name}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {segmentLabel(it.lead.segment)}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {LEAD_STATUS_LABELS_RU[it.lead.status]}
                    </td>
                    <td className="px-3 py-2 text-zinc-700">
                      {ACTION_LABELS[it.next_action.action]}
                    </td>
                    <td className={`px-3 py-2 ${urgClass}`}>
                      {it.next_action.due_date ?? "—"}
                      {urg ? (
                        <span className="ml-2 text-xs">
                          ({URGENCY_LABELS[urg]})
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
