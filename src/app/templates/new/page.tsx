import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TemplateForm } from "@/components/templates/TemplateForm";
import { listSegments } from "@/lib/db/segments";
import {
  TEMPLATE_KINDS,
  type SegmentWithAny,
  type TemplateKind,
} from "@/lib/schemas";

export const metadata = {
  title: "Новый шаблон · Mitja CRM",
};

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ segment?: string; kind?: string }>;
}) {
  const sp = await searchParams;
  const segments = await listSegments();

  const validSegments = new Set<string>([
    "any",
    ...segments.map((s) => s.slug),
  ]);
  const initialSegment =
    sp.segment && validSegments.has(sp.segment)
      ? (sp.segment as SegmentWithAny)
      : undefined;
  const initialKind = (TEMPLATE_KINDS as readonly string[]).includes(sp.kind ?? "")
    ? (sp.kind as TemplateKind)
    : undefined;

  return (
    <>
      <PageHeader
        title="Новый шаблон"
        description="Русский текст. Используйте плейсхолдеры {name}, {company}, {city}, {hook} — они подставятся при отправке."
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
        mode="create"
        segments={segments}
        initial={{
          segment: initialSegment,
          kind: initialKind,
        }}
      />
    </>
  );
}
