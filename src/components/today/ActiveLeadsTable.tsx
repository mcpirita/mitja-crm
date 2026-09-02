"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { LeadRow, LeadStatus, SegmentRow } from "@/lib/schemas";
import { LEAD_STATUSES, LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import { STATUS_TONE } from "@/components/leads/StatusBadge";
import { SectionHead } from "./TodayGroup";
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
  due: "пора",
  soon: "скоро",
  later: "позже",
  backlog: "без срока",
};

const URGENCY_COLOR: Record<string, string> = {
  due: "var(--amber-hi)",
  soon: "var(--steel)",
  later: "var(--dim)",
  backlog: "var(--dimmer)",
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
    <section className="rise">
      <SectionHead title="Все активные" count={filtered.length} />

      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="cap">Сегмент</span>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="ctl py-1.5 text-[12.5px]"
          >
            <option value="">Все</option>
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label_ru}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="cap">Статус</span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus | "")}
            className="ctl py-1.5 text-[12.5px]"
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
        <div className="rounded-[3px] border border-dashed border-[var(--line)] px-4 py-6 text-center text-[13px] italic text-[var(--dimmer)]">
          Ничего не найдено.
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="ops min-w-full">
            <thead>
              <tr>
                <th className="w-px pr-0">№</th>
                <th>Компания</th>
                <th>Сегмент</th>
                <th>Статус</th>
                <th>Действие</th>
                <th className="w-px">Срок</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((it, i) => {
                const urg = it.next_action.urgency;
                return (
                  <tr key={it.lead.id} data-prio={it.lead.priority}>
                    <td className="idx">{String(i + 1).padStart(2, "0")}</td>
                    <td>
                      <Link
                        href={`/leads/${it.lead.id}`}
                        className="text-[14px] text-[var(--text)] transition-colors hover:text-[var(--amber-hi)]"
                      >
                        {it.lead.company}
                      </Link>
                      {it.lead.name ? (
                        <div className="mt-0.5 font-mono text-[10.5px] text-[var(--dimmer)]">
                          {it.lead.name}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-[12.5px] text-[var(--dim)]">
                      {segmentLabel(it.lead.segment)}
                    </td>
                    <td>
                      <span
                        className="font-mono text-[10.5px] tracking-[.06em]"
                        style={{ color: `var(--tone-${STATUS_TONE[it.lead.status]})` }}
                      >
                        {LEAD_STATUS_LABELS_RU[it.lead.status]}
                      </span>
                    </td>
                    <td className="text-[12.5px] text-[var(--dim)]">
                      {ACTION_LABELS[it.next_action.action]}
                    </td>
                    <td className="whitespace-nowrap font-mono text-[11px]">
                      <span className="text-[var(--dim)]">
                        {it.next_action.due_date ?? "—"}
                      </span>
                      {urg ? (
                        <span
                          className="ml-2 text-[10px]"
                          style={{ color: URGENCY_COLOR[urg] ?? "var(--dimmer)" }}
                        >
                          {URGENCY_LABELS[urg]}
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
