import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { findSimilarPairs } from "@/lib/db/dedup";

export const metadata = {
  title: "Похожие лиды · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function DuplicatesPage() {
  const pairs = await findSimilarPairs();

  return (
    <>
      <PageHeader
        title="Похожие лиды"
        description="Возможные дубли по названию компании. Откройте обе карточки и решите, объединять ли вручную."
        actions={
          <Link
            href="/leads"
            className="btn"
          >
            К списку
          </Link>
        }
      />

      {pairs.length === 0 ? (
        <div className="panel p-6 text-sm text-zinc-500">
          Похожих лидов не найдено — дублей по названию компании нет.
        </div>
      ) : (
        <ul className="space-y-3">
          {pairs.map(({ a, b, reason }) => (
            <li
              key={`${a.id}-${b.id}`}
              className="panel p-4"
            >
              <div className="mb-2 text-xs uppercase tracking-wide text-amber-700">
                {reason}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[a, b].map((lead) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block rounded-md border border-zinc-200 px-3 py-2 hover:bg-zinc-50"
                  >
                    <div className="font-medium text-zinc-900">
                      {lead.company}
                    </div>
                    {lead.name ? (
                      <div className="text-sm text-zinc-500">{lead.name}</div>
                    ) : null}
                    {lead.email ? (
                      <div className="text-sm text-zinc-500">{lead.email}</div>
                    ) : null}
                  </Link>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
