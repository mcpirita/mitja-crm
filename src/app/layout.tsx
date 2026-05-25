import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "Mitja CRM",
  description: "Личная CRM для outreach по аренде в Пфорцхайме",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900">
        <TopNav />
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 sm:px-6">
          {children}
        </main>
      </body>
    </html>
  );
}
