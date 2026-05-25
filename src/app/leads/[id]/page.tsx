import { PageHeader } from "@/components/PageHeader";
import { LeadDetail } from "@/components/leads/LeadDetail";
import { listSegments } from "@/lib/db/segments";

export const metadata = {
  title: "Лид · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function LeadPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const numericId = Number(id);
  const segments = await listSegments();

  return (
    <>
      <PageHeader title="Карточка лида" description="Данные, hook, таймлайн касаний." />
      <LeadDetail id={numericId} segments={segments} />
    </>
  );
}
