"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  SEGMENT_COLOR_PALETTE,
  type SegmentColor,
  type SegmentRow,
} from "@/lib/schemas";
import { SWATCH_CLASSES } from "./swatchClasses";

interface Props {
  segment: SegmentRow;
  leadCount: number;
  templateCount: number;
}

export function SegmentEditForm({ segment, leadCount, templateCount }: Props) {
  const router = useRouter();
  const [label, setLabel] = useState(segment.label_ru);
  const [color, setColor] = useState<SegmentColor>(
    (segment.color as SegmentColor) ?? "zinc",
  );
  const [submitting, setSubmitting] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const archived = segment.is_archived === 1;
  const usageTotal = leadCount + templateCount;
  const dirty =
    label.trim() !== segment.label_ru || color !== segment.color;

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!label.trim()) {
      setError("Введите название.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {};
      if (label.trim() !== segment.label_ru) payload.label_ru = label.trim();
      if (color !== segment.color) payload.color = color;
      const res = await fetch(`/api/segments/${segment.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSubmitting(false);
    }
  }

  async function onToggleArchive() {
    setArchiving(true);
    setError(null);
    try {
      const res = await fetch(`/api/segments/${segment.slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: archived ? 0 : 1 }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось обновить");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setArchiving(false);
    }
  }

  async function onDelete() {
    if (usageTotal > 0) return;
    if (
      !window.confirm(`Удалить сегмент «${segment.label_ru}»? Действие необратимо.`)
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/segments/${segment.slug}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error ?? "Не удалось удалить");
      }
      router.push("/segments");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setDeleting(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-zinc-200 bg-white p-6"
    >
      <div className="space-y-4">
        <Field label="Название">
          <input
            type="text"
            required
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
          />
        </Field>

        <Field label="Цвет">
          <div className="flex flex-wrap gap-2">
            {SEGMENT_COLOR_PALETTE.map((c) => {
              const selected = c === color;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-label={c}
                  title={c}
                  className={`h-8 w-8 rounded-md border-2 ${SWATCH_CLASSES[c]} ${
                    selected ? "ring-2 ring-offset-1 ring-zinc-900" : ""
                  }`}
                />
              );
            })}
          </div>
        </Field>

        <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
          <div className="flex flex-wrap items-center gap-3">
            <span>
              Используется: <strong>{leadCount}</strong> лидов,{" "}
              <strong>{templateCount}</strong> шаблонов.
            </span>
            {archived ? (
              <span className="inline-flex items-center rounded-md border border-zinc-300 bg-white px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                В архиве
              </span>
            ) : null}
          </div>
          {usageTotal > 0 ? (
            <div className="mt-1 text-xs text-zinc-500">
              Сегмент нельзя удалить, пока он используется. Можно отправить в
              архив — он скроется из выпадающих списков.
            </div>
          ) : null}
        </div>

        {error ? (
          <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onDelete}
            disabled={usageTotal > 0 || deleting || submitting || archiving}
            title={
              usageTotal > 0
                ? "Нельзя удалить: сегмент используется"
                : "Удалить сегмент"
            }
            className="text-sm text-red-700 hover:text-red-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deleting ? "Удаляем..." : "Удалить"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onToggleArchive}
              disabled={archiving || submitting || deleting}
              className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {archiving
                ? "..."
                : archived
                  ? "Восстановить из архива"
                  : "В архив"}
            </button>
            <button
              type="submit"
              disabled={!dirty || submitting || archiving || deleting}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
            >
              {submitting ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-800">
        {label}
      </span>
      {children}
    </label>
  );
}
