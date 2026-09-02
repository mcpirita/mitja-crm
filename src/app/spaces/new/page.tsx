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
            className="btn"
          >
            К списку
          </Link>
        }
      />
      <SpaceForm mode="create" />
    </>
  );
}
