"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DEAL_TYPES,
  DEAL_TYPE_LABELS_RU,
  LEAD_STATUSES,
  LEAD_STATUS_LABELS_RU,
  PRIORITIES,
  PRIORITY_LABELS_RU,
  SEGMENT_COLOR_PALETTE,
  SOURCES,
  type LeadRow,
  type SegmentColor,
  type SegmentRow,
} from "@/lib/schemas";
import { SWATCH_CLASSES } from "@/components/segments/swatchClasses";

const SOURCE_LABELS_RU: Record<(typeof SOURCES)[number], string> = {
  linkedin: "LinkedIn",
  google: "Google",
  catalog: "Каталог",
  referral: "Реферал",
  other: "Другое",
};

interface Props {
  lead: LeadRow;
  onSaved: (updated: LeadRow) => void;
  onCancel: () => void;
}

export function LeadEditForm({ lead, onSaved, onCancel }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);

  const [showNewSegment, setShowNewSegment] = useState(false);
  const [previousSegment, setPreviousSegment] = useState<string>(lead.segment);
  const [newSegmentLabel, setNewSegmentLabel] = useState("");
  const [newSegmentColor, setNewSegmentColor] = useState<SegmentColor>(
    SEGMENT_COLOR_PALETTE[0],
  );
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [newSegmentError, setNewSegmentError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: lead.name,
    company: lead.company,
    email: lead.email ?? "",
    website: lead.website ?? "",
    country: lead.country,
    city: lead.city ?? "",
    segment: lead.segment as string,
    source: lead.source,
    status: lead.status,
    deal_type: lead.deal_type,
    priority: lead.priority,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/segments");
        if (!res.ok) throw new Error("Не удалось загрузить сегменты");
        const data = (await res.json()) as SegmentRow[];
        if (!cancelled) {
          setSegments(data);
          setSegmentsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSegmentsError(
            err instanceof Error ? err.message : "Ошибка загрузки сегментов",
          );
          setSegmentsLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onSegmentSelectChange(value: string) {
    if (value === "__new__") {
      setPreviousSegment(form.segment);
      setShowNewSegment(true);
      setNewSegmentError(null);
      return;
    }
    update("segment", value);
  }

  async function onCreateSegment() {
    const label = newSegmentLabel.trim();
    if (!label) {
      setNewSegmentError("Введите название сегмента");
      return;
    }
    setCreatingSegment(true);
    setNewSegmentError(null);
    try {
      const res = await fetch("/api/segments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label_ru: label, color: newSegmentColor }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось создать сегмент");
      }
      const created = (await res.json()) as SegmentRow;
      setSegments((prev) => [...prev, created]);
      update("segment", created.slug);
      setShowNewSegment(false);
      setNewSegmentLabel("");
      setNewSegmentColor(SEGMENT_COLOR_PALETTE[0]);
      router.refresh();
    } catch (err) {
      setNewSegmentError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setCreatingSegment(false);
    }
  }

  function onCancelNewSegment() {
    setShowNewSegment(false);
    setNewSegmentLabel("");
    setNewSegmentColor(SEGMENT_COLOR_PALETTE[0]);
    setNewSegmentError(null);
    update("segment", previousSegment);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        company: form.company.trim(),
        country: form.country.trim() || "DE",
        segment: form.segment,
        source: form.source,
        status: form.status,
        deal_type: form.deal_type,
        priority: form.priority,
        email: form.email.trim() === "" ? null : form.email.trim(),
        website: form.website.trim() === "" ? null : form.website.trim(),
        city: form.city.trim() === "" ? null : form.city.trim(),
      };
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      const updated = (await res.json()) as LeadRow;
      onSaved(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1";

  const visibleSegments = segments.filter((s) => s.is_archived === 0);
  const currentSegmentInList = visibleSegments.some(
    (s) => s.slug === form.segment,
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Имя контакта</label>
          <input
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            placeholder="Если знаешь — иначе оставь пустым"
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Компания *</label>
          <input
            required
            value={form.company}
            onChange={(e) => update("company", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={form.email}
            onChange={(e) => update("email", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Сайт</label>
          <input
            value={form.website}
            onChange={(e) => update("website", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Страна</label>
          <input
            value={form.country}
            onChange={(e) => update("country", e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label className={labelCls}>Город</label>
          <input
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Сегмент *</label>
          <select
            value={showNewSegment ? "__new__" : form.segment}
            onChange={(e) => onSegmentSelectChange(e.target.value)}
            className={inputCls}
            disabled={segmentsLoading}
          >
            {segmentsLoading ? (
              <option value="">Загрузка...</option>
            ) : (
              <>
                {!currentSegmentInList && form.segment ? (
                  <option value={form.segment}>
                    {form.segment} (текущий)
                  </option>
                ) : null}
                {visibleSegments.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label_ru}
                  </option>
                ))}
                <option value="__new__">➕ Новый сегмент…</option>
              </>
            )}
          </select>
          {segmentsError ? (
            <p className="mt-1 text-xs text-rose-700">{segmentsError}</p>
          ) : null}
          {showNewSegment ? (
            <div className="mt-3 rounded-md border border-zinc-200 bg-zinc-50 p-3 space-y-3">
              <div>
                <label className={labelCls}>Название сегмента</label>
                <input
                  autoFocus
                  value={newSegmentLabel}
                  onChange={(e) => setNewSegmentLabel(e.target.value)}
                  placeholder="Например, Картинг"
                  className={inputCls}
                  disabled={creatingSegment}
                />
              </div>
              <div>
                <label className={labelCls}>Цвет</label>
                <div className="flex flex-wrap gap-2">
                  {SEGMENT_COLOR_PALETTE.map((c) => {
                    const selected = c === newSegmentColor;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewSegmentColor(c)}
                        disabled={creatingSegment}
                        aria-label={c}
                        title={c}
                        className={`h-8 w-8 rounded-md border-2 ${SWATCH_CLASSES[c]} ${
                          selected
                            ? "ring-2 ring-offset-1 ring-zinc-900"
                            : ""
                        } disabled:opacity-50`}
                      />
                    );
                  })}
                </div>
              </div>
              {newSegmentError ? (
                <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
                  {newSegmentError}
                </div>
              ) : null}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={onCreateSegment}
                  disabled={creatingSegment}
                  className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
                >
                  {creatingSegment ? "Создаём…" : "Создать сегмент"}
                </button>
                <button
                  type="button"
                  onClick={onCancelNewSegment}
                  disabled={creatingSegment}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
                >
                  Отмена
                </button>
              </div>
            </div>
          ) : null}
        </div>
        <div>
          <label className={labelCls}>Тип сделки</label>
          <select
            value={form.deal_type}
            onChange={(e) =>
              update("deal_type", e.target.value as (typeof DEAL_TYPES)[number])
            }
            className={inputCls}
          >
            {DEAL_TYPES.map((d) => (
              <option key={d} value={d}>
                {DEAL_TYPE_LABELS_RU[d]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Приоритет</label>
          <select
            value={form.priority}
            onChange={(e) =>
              update("priority", e.target.value as (typeof PRIORITIES)[number])
            }
            className={inputCls}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS_RU[p]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelCls}>Источник</label>
          <select
            value={form.source}
            onChange={(e) =>
              update("source", e.target.value as (typeof SOURCES)[number])
            }
            className={inputCls}
          >
            {SOURCES.map((s) => (
              <option key={s} value={s}>
                {SOURCE_LABELS_RU[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Статус</label>
          <select
            value={form.status}
            onChange={(e) =>
              update("status", e.target.value as (typeof LEAD_STATUSES)[number])
            }
            className={inputCls}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS_RU[s]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-zinc-500">
            Прямое изменение статуса (без создания события). Для обычного потока
            используй быстрые кнопки в карточке.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Сохраняем..." : "Сохранить"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
