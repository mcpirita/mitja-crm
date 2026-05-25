"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  LEAD_STATUSES,
  LEAD_STATUS_LABELS_RU,
  SEGMENTS,
  SEGMENT_LABELS_RU,
  SOURCES,
  type LeadRow,
} from "@/lib/schemas";

const SOURCE_LABELS_RU: Record<(typeof SOURCES)[number], string> = {
  linkedin: "LinkedIn",
  google: "Google",
  catalog: "Каталог",
  referral: "Реферал",
  other: "Другое",
};

export function LeadCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    website: "",
    country: "DE",
    city: "",
    segment: "gastro" as (typeof SEGMENTS)[number],
    source: "other" as (typeof SOURCES)[number],
    status: "new" as (typeof LEAD_STATUSES)[number],
    hook_text: "",
    notes: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        company: form.company,
        country: form.country,
        segment: form.segment,
        source: form.source,
        status: form.status,
      };
      if (form.email.trim()) payload.email = form.email.trim();
      if (form.website.trim()) payload.website = form.website.trim();
      if (form.city.trim()) payload.city = form.city.trim();
      if (form.hook_text.trim()) payload.hook_text = form.hook_text.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось создать лида");
      }
      const lead = (await res.json()) as LeadRow;
      router.push(`/leads/${lead.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-zinc-900";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1";

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6 max-w-2xl"
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Имя *</label>
          <input
            required
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
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
        <div>
          <label className={labelCls}>Сегмент *</label>
          <select
            value={form.segment}
            onChange={(e) =>
              update("segment", e.target.value as (typeof SEGMENTS)[number])
            }
            className={inputCls}
          >
            {SEGMENTS.map((s) => (
              <option key={s} value={s}>
                {SEGMENT_LABELS_RU[s]}
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
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Hook (локация / зацепка)</label>
          <textarea
            value={form.hook_text}
            onChange={(e) => update("hook_text", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
        <div className="sm:col-span-2">
          <label className={labelCls}>Заметки</label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            rows={3}
            className={inputCls}
          />
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
          {error}
        </div>
      ) : null}

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {submitting ? "Создаём..." : "Создать"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
