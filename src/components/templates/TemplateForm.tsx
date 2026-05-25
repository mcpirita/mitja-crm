"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  TEMPLATE_KINDS,
  TEMPLATE_KIND_LABELS_RU,
  type SegmentRow,
  type SegmentWithAny,
  type TemplateKind,
} from "@/lib/schemas";
import { TemplatePreview } from "@/components/templates/TemplatePreview";

type Mode = "create" | "edit";

export type TemplateFormValues = {
  name: string;
  segment: SegmentWithAny;
  kind: TemplateKind;
  subject: string;
  body: string;
};

const DEFAULT_VALUES: TemplateFormValues = {
  name: "",
  segment: "any",
  kind: "initial",
  subject: "",
  body: "",
};

export function TemplateForm({
  mode,
  initial,
  templateId,
  segments,
}: {
  mode: Mode;
  initial?: Partial<TemplateFormValues>;
  templateId?: number;
  segments: SegmentRow[];
}) {
  const router = useRouter();
  const [values, setValues] = useState<TemplateFormValues>({
    ...DEFAULT_VALUES,
    ...initial,
  });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeSegments = segments.filter((s) => s.is_archived === 0);
  const knownSlugs = new Set<string>(["any", ...segments.map((s) => s.slug)]);
  const showStaleSegment =
    values.segment !== "any" && !knownSlugs.has(values.segment);

  function update<K extends keyof TemplateFormValues>(
    key: K,
    value: TemplateFormValues[K],
  ) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): string | null {
    if (!values.name.trim()) return "Введите название шаблона.";
    if (!values.subject.trim()) return "Введите тему письма.";
    if (!values.body.trim()) return "Введите тело письма.";
    return null;
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: values.name.trim(),
        language: "ru" as const,
        segment: values.segment,
        kind: values.kind,
        subject: values.subject.trim(),
        body: values.body,
      };

      if (mode === "create") {
        const res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Не удалось создать шаблон");
        }
        const row = (await res.json()) as { id: number };
        router.push(`/templates/${row.id}`);
        router.refresh();
      } else {
        if (!templateId) throw new Error("Не указан id шаблона");
        const res = await fetch(`/api/templates/${templateId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || "Не удалось сохранить");
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
    if (!templateId) return;
    if (!confirm("Удалить шаблон? Это действие необратимо.")) return;
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/templates/${templateId}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        throw new Error("Не удалось удалить");
      }
      router.push("/templates");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
      setDeleting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className="rounded-lg border border-zinc-200 bg-white p-6"
      >
        <div className="space-y-4">
          <Field label="Название">
            <input
              type="text"
              required
              value={values.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              placeholder="Например: Gastro · первое письмо"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Сегмент">
              <select
                value={values.segment}
                onChange={(e) =>
                  update("segment", e.target.value as SegmentWithAny)
                }
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              >
                {showStaleSegment ? (
                  <option value={values.segment}>
                    {values.segment} (текущий)
                  </option>
                ) : null}
                <option value="any">Любой (универсальный)</option>
                {activeSegments.map((s) => (
                  <option key={s.slug} value={s.slug}>
                    {s.label_ru}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Тип">
              <select
                value={values.kind}
                onChange={(e) => update("kind", e.target.value as TemplateKind)}
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              >
                {TEMPLATE_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {TEMPLATE_KIND_LABELS_RU[k]}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Тема письма">
            <input
              type="text"
              required
              value={values.subject}
              onChange={(e) => update("subject", e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none"
              placeholder="Например: Аренда помещения в {city}"
            />
          </Field>

          <Field
            label="Тело письма"
            hint="Доступные плейсхолдеры: {name}, {company}, {city}, {hook}"
          >
            <textarea
              required
              value={values.body}
              onChange={(e) => update("body", e.target.value)}
              rows={14}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 font-mono text-sm focus:border-zinc-900 focus:outline-none"
              placeholder="Здравствуйте, {name}!&#10;..."
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
                onClick={() => router.push("/templates")}
                className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={submitting || deleting}
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700 disabled:opacity-50"
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

      <div>
        <TemplatePreview subject={values.subject} body={values.body} />
      </div>
    </div>
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
      <span className="mb-1 block text-sm font-medium text-zinc-800">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="mt-1 block text-xs text-zinc-500">{hint}</span>
      ) : null}
    </label>
  );
}
