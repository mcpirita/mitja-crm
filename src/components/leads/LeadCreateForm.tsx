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

export function LeadCreateForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"go" | "again">("go");
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<string | null>(null);

  const [duplicates, setDuplicates] = useState<
    { lead: LeadRow; reasons: string[] }[]
  >([]);
  const [dupConfirmed, setDupConfirmed] = useState(false);

  const [segments, setSegments] = useState<SegmentRow[]>([]);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [segmentsError, setSegmentsError] = useState<string | null>(null);

  const [showNewSegment, setShowNewSegment] = useState(false);
  const [previousSegment, setPreviousSegment] = useState<string>("");
  const [newSegmentLabel, setNewSegmentLabel] = useState("");
  const [newSegmentColor, setNewSegmentColor] = useState<SegmentColor>(
    SEGMENT_COLOR_PALETTE[0],
  );
  const [creatingSegment, setCreatingSegment] = useState(false);
  const [newSegmentError, setNewSegmentError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    company: "",
    email: "",
    website: "",
    country: "DE",
    city: "",
    segment: "" as string,
    source: "other" as (typeof SOURCES)[number],
    status: "new" as (typeof LEAD_STATUSES)[number],
    deal_type: "rent" as (typeof DEAL_TYPES)[number],
    priority: "medium" as (typeof PRIORITIES)[number],
    hook_text: "",
    notes: "",
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
          const firstActive = data.find((s) => s.is_archived === 0);
          setForm((prev) =>
            prev.segment === ""
              ? { ...prev, segment: firstActive?.slug ?? "other" }
              : prev,
          );
        }
      } catch (err) {
        if (!cancelled) {
          setSegmentsError(
            err instanceof Error ? err.message : "Ошибка загрузки сегментов",
          );
          setSegmentsLoading(false);
          setForm((prev) =>
            prev.segment === "" ? { ...prev, segment: "other" } : prev,
          );
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
    // Поменяли идентифицирующее поле — сбрасываем подтверждение дубля.
    if (key === "name" || key === "company" || key === "email") {
      setDuplicates([]);
      setDupConfirmed(false);
    }
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
    const fallback =
      previousSegment ||
      segments.find((s) => s.is_archived === 0)?.slug ||
      "other";
    update("segment", fallback);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Шаг 1: проверка на дубли (пока пользователь не подтвердил «создать всё равно»).
    if (!dupConfirmed) {
      setSubmitting(true);
      try {
        const params = new URLSearchParams();
        if (form.email.trim()) params.set("email", form.email.trim());
        if (form.company.trim()) params.set("company", form.company.trim());
        if (form.name.trim()) params.set("name", form.name.trim());
        const res = await fetch(`/api/leads/check-duplicates?${params.toString()}`);
        if (res.ok) {
          const data = (await res.json()) as {
            matches: { lead: LeadRow; reasons: string[] }[];
          };
          if (data.matches.length > 0) {
            setDuplicates(data.matches);
            setDupConfirmed(true); // следующий клик создаст несмотря на дубли
            setSubmitting(false);
            return;
          }
        }
      } catch {
        // Проверка дублей не критична — при сбое просто продолжаем создание.
      }
    }

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
        deal_type: form.deal_type,
        priority: form.priority,
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
      if (submitMode === "again") {
        const keepSegment = form.segment;
        const keepSource = form.source;
        const keepStatus = form.status;
        const keepCountry = form.country;
        const keepDealType = form.deal_type;
        const keepPriority = form.priority;
        setForm({
          name: "",
          company: "",
          email: "",
          website: "",
          country: keepCountry,
          city: "",
          segment: keepSegment,
          source: keepSource,
          status: keepStatus,
          deal_type: keepDealType,
          priority: keepPriority,
          hook_text: "",
          notes: "",
        });
        setJustCreated(lead.company || lead.name || "Лид");
        setDuplicates([]);
        setDupConfirmed(false);
        setSubmitting(false);
        router.refresh();
      } else {
        router.push(`/leads/${lead.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setSubmitting(false);
    }
  }

  const inputCls =
    "w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[var(--amber)]";
  const labelCls = "block text-sm font-medium text-zinc-700 mb-1";

  const visibleSegments = segments.filter((s) => s.is_archived === 0);

  return (
    <form
      onSubmit={onSubmit}
      className="panel p-6 max-w-2xl"
    >
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
                            ? "ring-2 ring-offset-1 ring-[var(--amber)]"
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
                  className="btn btn-primary disabled:opacity-50"
                >
                  {creatingSegment ? "Создаём…" : "Создать сегмент"}
                </button>
                <button
                  type="button"
                  onClick={onCancelNewSegment}
                  disabled={creatingSegment}
                  className="btn disabled:opacity-50"
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

      {duplicates.length > 0 ? (
        <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-3 text-sm text-amber-900">
          <p className="font-medium">
            Похоже, такой лид уже есть ({duplicates.length}):
          </p>
          <ul className="mt-2 space-y-1">
            {duplicates.map(({ lead, reasons }) => (
              <li key={lead.id}>
                <a
                  href={`/leads/${lead.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium underline hover:text-amber-700"
                >
                  {lead.company}
                  {lead.name ? ` — ${lead.name}` : ""}
                </a>{" "}
                <span className="text-amber-700">({reasons.join(", ")})</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-amber-700">
            Нажмите «Создать всё равно», если это другой лид.
          </p>
        </div>
      ) : null}

      {justCreated ? (
        <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Лид «{justCreated}» создан. Можно добавлять следующий.
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="submit"
          onClick={() => setSubmitMode("go")}
          disabled={submitting}
          className="btn btn-primary disabled:opacity-50"
        >
          {submitting && submitMode === "go"
            ? "Создаём..."
            : dupConfirmed
              ? "Создать всё равно"
              : "Создать"}
        </button>
        <button
          type="submit"
          onClick={() => setSubmitMode("again")}
          disabled={submitting}
          className="btn disabled:opacity-50"
        >
          {submitting && submitMode === "again"
            ? "Создаём..."
            : dupConfirmed
              ? "Создать всё равно и добавить ещё"
              : "Создать и добавить ещё"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="btn"
        >
          Отмена
        </button>
      </div>
    </form>
  );
}
