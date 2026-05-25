import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { SpaceForm } from "@/components/spaces/SpaceForm";
import { getSpace } from "@/lib/db/spaces";

export const metadata = {
  title: "Помещение · Mitja CRM",
};

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idRaw } = await params;
  const id = Number(idRaw);
  if (!Number.isInteger(id) || id <= 0) {
    notFound();
  }

  const row = await getSpace(id);
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
            href="/spaces"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            К списку
          </Link>
        }
      />
      <SpaceForm mode="edit" spaceId={row.id} initial={row} />
    </>
  );
}
