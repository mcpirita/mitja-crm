import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { TemplateFilters } from "@/components/templates/TemplateFilters";
import { listTemplates } from "@/lib/db/templates";
import { listSegments } from "@/lib/db/segments";
import {
  SegmentWithAny,
  TEMPLATE_KIND_LABELS_RU,
  TemplateKind,
} from "@/lib/schemas";

export const metadata = {
  title: "Шаблоны · Mitja CRM",
};

function preview(body: string, limit = 80): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > limit ? `${flat.slice(0, limit)}…` : flat;
}

export default async function TemplatesPage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; kind?: string }>;
}) {
  const sp = await searchParams;

  const segmentParsed = sp.segment
    ? SegmentWithAny.safeParse(sp.segment)
    : null;
  const kindParsed = sp.kind ? TemplateKind.safeParse(sp.kind) : null;

  const [segments, rows] = await Promise.all([
    listSegments(),
    listTemplates({
      segment: segmentParsed?.success ? segmentParsed.data : undefined,
      kind: kindParsed?.success ? kindParsed.data : undefined,
    }),
  ]);

  const segmentLabelBySlug = new Map(
    segments.map((s) => [s.slug, s.label_ru]),
  );
  function segmentLabel(slug: string): string {
    if (slug === "any") return "Любой";
    return segmentLabelBySlug.get(slug) ?? slug;
  }

  const hasFilters = Boolean(sp.segment || sp.kind);

  return (
    <>
      <PageHeader
        title="Шаблоны писем"
        description="Шаблоны на русском. В момент отправки лиду переводятся на немецкий через Claude API."
        actions={
          <Link
            href="/templates/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
          >
            Новый шаблон
          </Link>
        }
      />

      <div className="mb-4">
        <TemplateFilters segments={segments} />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title={
            hasFilters ? "По фильтрам ничего нет" : "Шаблонов пока нет"
          }
          description={
            hasFilters
              ? "Попробуйте сменить или сбросить фильтры."
              : "Создайте первый шаблон — для нужного сегмента и типа письма."
          }
          action={
            !hasFilters ? (
              <Link
                href="/templates/new"
                className="rounded-md bg-zinc-900 px-4 py-2 text-sm text-white hover:bg-zinc-700"
              >
                Новый шаблон
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Сегмент</th>
                <th className="px-4 py-3 font-medium">Тип</th>
                <th className="px-4 py-3 font-medium">Превью тела</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/templates/${row.id}`}
                      className="font-medium text-zinc-900 hover:underline"
                    >
                      {row.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700">
                      {segmentLabel(row.segment)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                      {TEMPLATE_KIND_LABELS_RU[row.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">
                    {preview(row.body)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
