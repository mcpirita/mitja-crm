"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LeadRow as LeadRowType, SegmentRow } from "@/lib/schemas";
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS_RU,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS_RU,
} from "@/lib/schemas";
import { LeadRow } from "./LeadRow";
import { EmptyState } from "@/components/EmptyState";

/** Статусы, которые считаем «в работе» — переписка идёт, исход не наступил. */
const IN_FLIGHT = new Set([
  "contacted",
  "awaiting_reply",
  "fup1_sent",
  "fup2_sent",
  "replied_later",
  "meeting_scheduled",
  "viewing_done",
  "in_negotiation",
]);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 basis-[calc(50%-0.5rem)] flex-col gap-1.5 sm:basis-auto">
      <span className="cap">{label}</span>
      {children}
    </label>
  );
}

function Readout({
  value,
  label,
  tone,
}: {
  value: number;
  label: string;
  tone?: "amber" | "green";
}) {
  const color =
    tone === "amber"
      ? "text-[var(--amber-hi)]"
      : tone === "green"
        ? "text-[var(--green)]"
        : "text-[var(--text)]";
  return (
    <div className="flex flex-col gap-0.5">
      <span className={`font-mono text-[17px] font-bold leading-none ${color}`}>
        {String(value).padStart(2, "0")}
      </span>
      <span className="cap text-[8.5px]">{label}</span>
    </div>
  );
}

export function LeadsListClient({ segments }: { segments: SegmentRow[] }) {
  const [leads, setLeads] = useState<LeadRowType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [dealType, setDealType] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [debouncedQuery, setDebouncedQuery] = useState<string>("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(t);
  }, [query]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (segment) params.set("segment", segment);
    if (status) params.set("status", status);
    if (dealType) params.set("deal_type", dealType);
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    const s = params.toString();
    return s ? "?" + s : "";
  }, [segment, status, dealType, debouncedQuery]);

  useEffect(() => {
    let cancelled = false;
    setError(null);
    fetch("/api/leads" + queryString)
      .then(async (res) => {
        if (!res.ok) throw new Error("Не удалось загрузить лидов");
        return (await res.json()) as LeadRowType[];
      })
      .then((data) => {
        if (!cancelled) setLeads(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Ошибка");
          setLeads([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [queryString]);

  const stats = useMemo(() => {
    const rows = leads ?? [];
    return {
      total: rows.length,
      inFlight: rows.filter((l) => IN_FLIGHT.has(l.status)).length,
      hot: rows.filter(
        (l) => l.status === "replied_interested" || l.status === "in_negotiation",
      ).length,
    };
  }, [leads]);

  const hasFilters = Boolean(segment || status || dealType || query);

  return (
    <div className="rise">
      {/* ── пульт фильтров ───────────────────────────────── */}
      <div className="panel mb-5 flex flex-wrap items-end gap-x-4 gap-y-3 px-4 py-3.5">
        <Field label="Поиск">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="имя или компания"
            className="ctl w-full sm:w-52"
          />
        </Field>
        <Field label="Тип сделки">
          <select
            value={dealType}
            onChange={(e) => setDealType(e.target.value)}
            className="ctl w-full sm:w-auto"
          >
            <option value="">Все</option>
            {DEAL_TYPES.map((d) => (
              <option key={d} value={d}>
                {DEAL_TYPE_LABELS_RU[d]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Сегмент">
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="ctl w-full sm:w-auto"
          >
            <option value="">Все</option>
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label_ru}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Статус">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="ctl w-full sm:w-auto"
          >
            <option value="">Все</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS_RU[s]}
              </option>
            ))}
          </select>
        </Field>

        {hasFilters ? (
          <button
            type="button"
            onClick={() => {
              setSegment("");
              setStatus("");
              setDealType("");
              setQuery("");
            }}
            className="btn btn-danger"
          >
            сбросить
          </button>
        ) : null}

        {/* сводка справа: сколько всего, сколько в работе, сколько горячих */}
        <div className="flex w-full items-end gap-6 border-t border-[var(--line)] pt-3 sm:ml-auto sm:w-auto sm:border-0 sm:pt-0 sm:pl-4">
          <Readout value={stats.total} label={hasFilters ? "найдено" : "всего"} />
          <Readout value={stats.inFlight} label="в работе" tone="amber" />
          <Readout value={stats.hot} label="горячие" tone="green" />
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-[3px] border border-[rgba(224,96,63,.35)] bg-[rgba(224,96,63,.1)] px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-[.1em] text-[var(--red)]">
          {error}
        </div>
      ) : null}

      {leads === null ? (
        <div className="panel px-4 py-10 text-center">
          <span className="cap animate-pulse">приём данных…</span>
        </div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="Лидов нет"
          description="Под текущие фильтры ничего не найдено. Добавьте лид вручную."
          action={
            <Link href="/leads/new" className="btn btn-primary">
              новый лид
            </Link>
          }
        />
      ) : (
        <div className="panel overflow-x-auto">
          <table className="ops min-w-full">
            <thead>
              <tr>
                <th className="w-px pr-0">№</th>
                <th>Компания</th>
                <th>Сегмент</th>
                <th>Статус</th>
                <th className="w-px">Приоритет</th>
                <th className="w-px">Обновлён</th>
                <th className="w-px" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead, i) => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  segments={segments}
                  index={i}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
