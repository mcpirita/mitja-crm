"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  SEGMENTS,
  SEGMENT_LABELS_RU,
  type Segment,
  type SpaceRow,
} from "@/lib/schemas";

type Mode = "create" | "edit";

export type SpaceFormValues = {
  name: string;
  floor: string;
  area_m2: string; // в форме держим строкой, парсим перед submit
  description: string;
  best_for_set: Set<Segment>;
  internal_notes: string;
};

function parseBestForCsv(csv: string): Set<Segment> {
  const result = new Set<Segment>();
  const allowed = new Set<string>(SEGMENTS);
  for (const part of csv.split(",")) {
    const trimmed = part.trim();
    if (trimmed && allowed.has(trimmed)) {
      result.add(trimmed as Segment);
    }
  }
  return result;
}

function buildBestForCsv(set: Set<Segment>): string {
  // Сохраняем порядок SEGMENTS для предсказуемости.
  return SEGMENTS.filter((s) => set.has(s)).join(",");
}

export function SpaceForm({
  mode,
  spaceId,
  initial,
}: {
  mode: Mode;
  spaceId?: number;
  initial?: Partial<SpaceRow>;
}) {
  const router = useRouter();
  const [values, setValues] = useState<SpaceFormValues>({
    name: initial?.name ?? "",
    floor: initial?.floor ?? "",
    area_m2:
      initial?.area_m2 === null || initial?.area_m2 === undefined
        ? ""
        : String(initial.area_m2),
    description: initial?.description ?? "",
    best_for_set: parseBestForCsv(initial?.best_for ?? ""),
    internal_notes: initial?.internal_notes ?? "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof SpaceFormValues>(
    key: K,
    value: SpaceFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function toggleSegment(seg: Segment) {
    setValues((prev) => {
      const next = new Set(prev.best_for_set);
      if (next.has(seg)) next.delete(seg);
      else next.add(seg);
      return { ...prev, best_for_set: next };
    });
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!values.name.trim()) {
      setError("Введите название.");
      return;
    }

    let area: number | null = null;
    if (values.area_m2.trim()) {
      const parsed = Number(values.area_m2.replace(",", "."));
      if (!Number.isFinite(parsed) || parsed < 0) {
        setError("Площадь должна быть числом ≥ 0.");
        return;
      }
      area = parsed;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        floor: values.floor.trim() || null,
        area_m2: area,
        description: values.description.trim(),
        best_for: buildBestForCsv(values.best_for_set),
        internal_notes: values.internal_notes.trim(),
      };

      if (mode === "create") {
        const res = await fetch("/api/spaces", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Не удалось создать помещение");
        }
        const row = (await res.json()) as SpaceRow;
        router.push(`/spaces/${row.id}`);
        router.refresh();
      } else {
        if (!spaceId) throw new Error("Не указан id помещения");
        const res = await fetch(`/api/spaces/${spaceId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Не удалось сохранить помещение");
        }
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!spaceId) return;
    if (!confirm("Удалить помещение? Это также снимет все привязки к лидам.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/spaces/${spaceId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        throw new Error("Не удалось удалить");
      }
      router.push("/spaces");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="panel p-6"
    >
      <div className="space-y-4">
        <Field label="Название">
          <input
            type="text"
            required
            value={values.name}
            onChange={(e) => update("name", e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--amber)] focus:outline-none"
            placeholder="Например: Kino 5"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Этаж">
            <input
              type="text"
              value={values.floor}
              onChange={(e) => update("floor", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--amber)] focus:outline-none"
              placeholder="EG / 1.OG / 3.OG"
            />
          </Field>

          <Field label="Площадь, м²">
            <input
              type="number"
              step="0.01"
              min="0"
              value={values.area_m2}
              onChange={(e) => update("area_m2", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--amber)] focus:outline-none"
              placeholder="170"
            />
          </Field>
        </div>

        <Field
          label="Описание"
          hint="Эта фактура передаётся Claude — описывай что есть, без цен."
        >
          <textarea
            value={values.description}
            onChange={(e) => update("description", e.target.value)}
            rows={4}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--amber)] focus:outline-none"
            placeholder="Светлое камерное помещение с панорамными окнами, AV-инфраструктура..."
          />
        </Field>

        <Field
          label="Подходит для (сегменты)"
          hint="Выбери, для каких типов арендаторов это помещение релевантно."
        >
          <div className="flex flex-wrap gap-2">
            {SEGMENTS.map((seg) => {
              const active = values.best_for_set.has(seg);
              return (
                <button
                  key={seg}
                  type="button"
                  onClick={() => toggleSegment(seg)}
                  className={
                    "rounded-full border px-3 py-1 text-xs transition-colors " +
                    (active
                      ? "border-[var(--amber)] bg-[var(--amber-soft)] text-[var(--amber-hi)]"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50")
                  }
                >
                  {SEGMENT_LABELS_RU[seg]}
                </button>
              );
            })}
          </div>
        </Field>

        <Field
          label="Внутренние заметки"
          hint="Цены, ставки, внутреннее — НЕ передаётся Claude."
        >
          <textarea
            value={values.internal_notes}
            onChange={(e) => update("internal_notes", e.target.value)}
            rows={3}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-[var(--amber)] focus:outline-none"
            placeholder="Например: ставка 12 €/м², свободно с июля..."
          />
        </Field>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div>
            {mode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting || submitting}
                className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50"
              >
                {deleting ? "Удаляем..." : "Удалить"}
              </button>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push("/spaces")}
              className="btn"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={submitting || deleting}
              className="btn btn-primary disabled:opacity-50"
            >
              {submitting
                ? "Сохраняем..."
                : mode === "create"
                  ? "Создать"
                  : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-800">{label}</span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
}
