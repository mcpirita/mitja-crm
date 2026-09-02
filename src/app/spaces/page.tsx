import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { listSpaces } from "@/lib/db/spaces";
import { SEGMENTS, SEGMENT_LABELS_RU, type Segment } from "@/lib/schemas";

export const metadata = {
  title: "Помещения · Mitja CRM",
};

function parseBestFor(csv: string): Segment[] {
  const allowed = new Set<string>(SEGMENTS);
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && allowed.has(s)) as Segment[];
}

export default async function SpacesPage({
  searchParams,
}: {
  searchParams: Promise<{ best_for?: string }>;
}) {
  const sp = await searchParams;
  const filterBestFor =
    sp.best_for && (SEGMENTS as readonly string[]).includes(sp.best_for)
      ? (sp.best_for as Segment)
      : undefined;

  const rows = await listSpaces({ best_for: filterBestFor });
  const hasFilter = Boolean(filterBestFor);

  return (
    <>
      <PageHeader
        title="Помещения"
        description="Каталог площадей в здании. Привязывай к лидам одно или несколько помещений — Claude использует их при генерации."
        actions={
          <Link
            href="/spaces/new"
            className="btn btn-primary"
          >
            Новое помещение
          </Link>
        }
      />

      <form method="GET" className="mb-4 flex items-center gap-2">
        <label className="text-sm text-zinc-600">Фильтр по сегменту:</label>
        <select
          name="best_for"
          defaultValue={filterBestFor ?? ""}
          className="rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm focus:border-[var(--amber)] focus:outline-none"
        >
          <option value="">— все —</option>
          {SEGMENTS.map((s) => (
            <option key={s} value={s}>
              {SEGMENT_LABELS_RU[s]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="btn"
        >
          Применить
        </button>
        {hasFilter ? (
          <Link
            href="/spaces"
            className="text-sm text-zinc-500 hover:text-zinc-900 hover:underline"
          >
            Сбросить
          </Link>
        ) : null}
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={hasFilter ? "По фильтру ничего нет" : "Помещений пока нет"}
          description={
            hasFilter
              ? "Попробуйте сбросить фильтр или выбрать другой сегмент."
              : "Создайте первое помещение — это будет каталог площадей здания."
          }
          action={
            !hasFilter ? (
              <Link
                href="/spaces/new"
                className="btn btn-primary"
              >
                Новое помещение
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden panel">
          <table className="ops w-full text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3 font-medium">Название</th>
                <th className="px-4 py-3 font-medium">Этаж</th>
                <th className="px-4 py-3 font-medium">Площадь, м²</th>
                <th className="px-4 py-3 font-medium">Сегменты</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const segs = parseBestFor(row.best_for);
                return (
                  <tr
                    key={row.id}
                    className="border-b border-zinc-100 last:border-0 hover:bg-zinc-50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/spaces/${row.id}`}
                        className="font-medium text-zinc-900 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.floor ?? <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-zinc-700">
                      {row.area_m2 !== null ? (
                        Math.round(row.area_m2)
                      ) : (
                        <span className="text-zinc-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {segs.length === 0 ? (
                          <span className="text-zinc-400">—</span>
                        ) : (
                          segs.map((seg) => (
                            <span
                              key={seg}
                              className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-700"
                            >
                              {SEGMENT_LABELS_RU[seg]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
