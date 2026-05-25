import { PageHeader } from "@/components/PageHeader";
import { ImportClient } from "@/components/import/ImportClient";

export const metadata = {
  title: "Импорт · Mitja CRM",
};

export default function ImportPage() {
  return (
    <>
      <PageHeader
        title="Импорт CSV"
        description="Загрузка лидов из CSV. Поддерживаются поля: имя, компания, email, сегмент, статус, город, хук."
      />
      <ImportClient />
    </>
  );
}
