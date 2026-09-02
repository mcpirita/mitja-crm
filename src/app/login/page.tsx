import { redirect } from "next/navigation";
import { getCreds } from "@/lib/auth";
import { LoginForm } from "@/components/LoginForm";

export const metadata = {
  title: "Вход · Mitja CRM",
};

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  // Локально защиты нет — форма не нужна.
  if (!getCreds()) redirect("/today");

  const { next } = await searchParams;
  // Пускаем только на внутренние адреса: открытый редирект нам не нужен.
  const target = next && next.startsWith("/") && !next.startsWith("//") ? next : "/today";

  return <LoginForm next={target} />;
}
