import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { SpaceForm } from "@/components/spaces/SpaceForm";

export const metadata = {
  title: "Новое помещение · Mitja CRM",
};

export default function NewSpacePage() {
  return (
    <>
      <PageHeader
        title="Новое помещение"
        description="Опиши площадку. Описание попадёт в промпт Claude, внутренние заметки — нет."
        actions={
          <Link
            href="/spaces"
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            К списку
          </Link>
        }
      />
      <SpaceForm mode="create" />
    </>
  );
}
