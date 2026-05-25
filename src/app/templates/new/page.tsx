import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { TemplateForm } from "@/components/templates/TemplateForm";

export const metadata = {
  title: "Новый шаблон · Mitja CRM",
};

export default function NewTemplatePage() {
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
      <TemplateForm mode="create" />
    </>
  );
}
