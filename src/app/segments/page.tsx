import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { listSegmentsWithCounts } from "@/lib/db/segments";
import { SWATCH_CLASSES } from "@/components/segments/swatchClasses";
import type { SegmentColor } from "@/lib/schemas";

export const metadata = {
  title: "Сегменты · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function SegmentsPage() {
  const rows = await listSegmentsWithCounts();

  return (
    <>
      <PageHeader
        title="Сегменты"
        description="Список типов арендаторов. Новые сегменты создаются из формы редактирования лида — кликни на сегмент, чтобы переименовать, сменить цвет, заархивировать или удалить."
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Сегментов пока нет"
          description="Создай первый сегмент из формы редактирования лида."
        />
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3 font-medium">Сегмент</th>
                <th className="px-4 py-3 font-medium">Использование</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const archived = row.is_archived === 1;
                const swatchCls =
                  SWATCH_CLASSES[row.color as SegmentColor] ??
                  SWATCH_CLASSES.zinc;
                return (
                  <tr
                    key={row.slug}
                    className={
                      "border-b border-zinc-100 last:border-0 hover:bg-zinc-50 " +
                      (archived ? "opacity-60" : "")
                    }
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/segments/${row.slug}`}
                        className="flex items-center gap-3 group"
                      >
                        <span
                          className={`h-5 w-5 shrink-0 rounded-md border-2 ${swatchCls}`}
                        />
                        <span className="font-medium text-zinc-900 group-hover:underline">
                          {row.label_ru}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                          Лидов: {row.lead_count}
                        </span>
                        <span className="inline-flex items-center rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-700">
                          Шаблонов: {row.template_count}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {archived ? (
                        <span className="inline-flex items-center rounded-md border border-zinc-300 bg-zinc-100 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-600">
                          Архив
                        </span>
                      ) : null}
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
