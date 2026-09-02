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
          <>
            <Link
              href="/leads/duplicates"
              className="btn"
            >
              Похожие
            </Link>
            <Link
              href="/leads/new"
              className="btn btn-primary"
            >
              Новый лид
            </Link>
          </>
        }
      />
      <LeadsListClient segments={segments} />
    </>
  );
}
