import { PageHeader } from "@/components/PageHeader";
import { LeadCreateForm } from "@/components/leads/LeadCreateForm";

export const metadata = {
  title: "Новый лид · Mitja CRM",
};

export default function NewLeadPage() {
  return (
    <>
      <PageHeader
        title="Новый лид"
        description="Заполните минимум: имя, компания, сегмент."
      />
      <LeadCreateForm />
    </>
  );
}
