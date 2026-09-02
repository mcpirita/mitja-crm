"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  TEMPLATE_KINDS,
  TEMPLATE_KIND_LABELS_RU,
  type SegmentRow,
} from "@/lib/schemas";

export function TemplateFilters({ segments }: { segments: SegmentRow[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const segment = searchParams.get("segment") ?? "";
  const kind = searchParams.get("kind") ?? "";

  const activeSegments = segments.filter((s) => s.is_archived === 0);

  function update(name: "segment" | "kind", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    const qs = params.toString();
    router.push(`/templates${qs ? `?${qs}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <label className="flex items-center gap-2 text-sm text-zinc-700">
        Сегмент:
        <select
          value={segment}
          onChange={(e) => update("segment", e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-[var(--amber)] focus:outline-none"
        >
          <option value="">Все</option>
          <option value="any">Любой (универсальный)</option>
          {activeSegments.map((s) => (
            <option key={s.slug} value={s.slug}>
              {s.label_ru}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-2 text-sm text-zinc-700">
        Тип:
        <select
          value={kind}
          onChange={(e) => update("kind", e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm focus:border-[var(--amber)] focus:outline-none"
        >
          <option value="">Все</option>
          {TEMPLATE_KINDS.map((k) => (
            <option key={k} value={k}>
              {TEMPLATE_KIND_LABELS_RU[k]}
            </option>
          ))}
        </select>
      </label>

      {segment || kind ? (
        <button
          type="button"
          onClick={() => router.push("/templates")}
          className="text-sm text-zinc-600 underline hover:text-zinc-900"
        >
          Сбросить
        </button>
      ) : null}
    </div>
  );
}
