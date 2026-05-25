import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "@/components/settings/SettingsForm";

export const metadata = {
  title: "Настройки · Mitja CRM",
};

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Настройки"
        description="Эти настройки управляют тем, как переводятся письма с русского на немецкий и как формируется подпись."
      />
      <SettingsForm />
    </>
  );
}
