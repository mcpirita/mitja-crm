import type { Metadata } from "next";
import { Manrope, Unbounded, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "700", "800"],
  variable: "--font-unbounded",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "700"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Mitja CRM",
  description: "Личная CRM для outreach по аренде в Пфорцхайме",
};

export const viewport = {
  themeColor: "#080d12",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ru"
      className={`h-full antialiased ${manrope.variable} ${unbounded.variable} ${jetbrains.variable}`}
    >
      <body className="min-h-full flex flex-col font-sans text-[15px] leading-relaxed">
        <div className="grain" aria-hidden />
        <TopNav />
        <main className="relative z-2 flex-1 w-full max-w-[1240px] mx-auto px-4 py-7 sm:px-6 pb-24">
          {children}
        </main>
      </body>
    </html>
  );
}
