import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import {
  countLeadsForSegment,
  countTemplatesForSegment,
  getSegment,
} from "@/lib/db/segments";
import { SegmentEditForm } from "@/components/segments/SegmentEditForm";

export const metadata = {
  title: "Сегмент · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function EditSegmentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const segment = await getSegment(slug);
  if (!segment) {
    notFound();
  }

  const [leadCount, templateCount] = await Promise.all([
    countLeadsForSegment(slug),
    countTemplatesForSegment(slug),
  ]);

  return (
    <>
      <PageHeader
        title={segment.label_ru}
        description={`Технический id (slug): ${segment.slug}`}
        actions={
          <Link
            href="/segments"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            К списку
          </Link>
        }
      />
      <SegmentEditForm
        segment={segment}
        leadCount={leadCount}
        templateCount={templateCount}
      />
    </>
  );
}
