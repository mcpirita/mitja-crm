import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { getTemplate } from "@/lib/db/templates";
import { listSegments } from "@/lib/db/segments";

export const metadata = {
  title: "Шаблон · Mitja CRM",
};

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const [row, segments] = await Promise.all([
    getTemplate(id),
    listSegments({ includeArchived: true }),
  ]);
  if (!row) {
    notFound();
  }

  return (
    <>
      <PageHeader
        title={row.name}
        description={`Обновлено: ${row.updated_at}`}
        actions={
          <Link
            href="/templates"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            К списку
          </Link>
        }
      />
      <TemplateForm
        mode="edit"
        templateId={row.id}
        segments={segments}
        initial={{
          name: row.name,
          segment: row.segment,
          kind: row.kind,
          subject: row.subject,
          body: row.body,
        }}
      />
    </>
  );
}
