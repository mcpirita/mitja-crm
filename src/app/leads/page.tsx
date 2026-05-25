import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { LeadsListClient } from "@/components/leads/LeadsListClient";
import { listSegments } from "@/lib/db/segments";

export const metadata = {
  title: "Лиды · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const segments = await listSegments();
  return (
    <>
      <PageHeader
        title="Лиды"
        description="Список лидов с сегментом, статусом и последним касанием."
        actions={
          <Link
            href="/leads/new"
            className="rounded-md bg-zinc-900 px-3 py-1.5 text-sm text-white hover:bg-zinc-800"
          >
            Новый лид
          </Link>
        }
      />
      <LeadsListClient segments={segments} />
    </>
  );
}
