"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { LeadRow as LeadRowType, SegmentRow } from "@/lib/schemas";
import { LEAD_STATUSES, LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import { LeadRow } from "./LeadRow";
import { EmptyState } from "@/components/EmptyState";

export function LeadsListClient({ segments }: { segments: SegmentRow[] }) {
  const [leads, setLeads] = useState<LeadRowType[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<string>("");
  const [status, setStatus] = useState<string>("");
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
    if (debouncedQuery.trim()) params.set("q", debouncedQuery.trim());
    const s = params.toString();
    return s ? "?" + s : "";
  }, [segment, status, debouncedQuery]);

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

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs text-zinc-600 mb-1">Поиск</label>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Имя или компания"
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white"
          />
        </div>
        <div>
          <label className="block text-xs text-zinc-600 mb-1">Сегмент</label>
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Все</option>
            {segments.map((s) => (
              <option key={s.slug} value={s.slug}>
                {s.label_ru}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-zinc-600 mb-1">Статус</label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white"
          >
            <option value="">Все</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS_RU[s]}
              </option>
            ))}
          </select>
        </div>
        {(segment || status || query) && (
          <button
            type="button"
            onClick={() => {
              setSegment("");
              setStatus("");
              setQuery("");
            }}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100"
          >
            Сбросить
          </button>
        )}
      </div>

      {error ? (
        <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      {leads === null ? (
        <div className="text-sm text-zinc-500">Загрузка...</div>
      ) : leads.length === 0 ? (
        <EmptyState
          title="Лидов нет"
          description="Под текущие фильтры ничего не найдено. Добавьте лид вручную."
          action={
            <Link
              href="/leads/new"
              className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
            >
              Новый лид
            </Link>
          }
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="min-w-full text-left">
            <thead className="bg-zinc-50">
              <tr className="text-xs uppercase tracking-wide text-zinc-600">
                <th className="px-3 py-2 font-medium">Компания</th>
                <th className="px-3 py-2 font-medium">Сегмент</th>
                <th className="px-3 py-2 font-medium">Статус</th>
                <th className="px-3 py-2 font-medium">Обновлён</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <LeadRow key={lead.id} lead={lead} segments={segments} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
