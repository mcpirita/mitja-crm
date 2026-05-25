"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/today", label: "Сегодня" },
  { href: "/leads", label: "Лиды" },
  { href: "/templates", label: "Шаблоны" },
  { href: "/import", label: "Импорт" },
  { href: "/settings", label: "Настройки" },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="w-full border-b border-zinc-200 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center gap-1 h-14 overflow-x-auto">
        <Link href="/today" className="font-semibold text-zinc-900 mr-4 shrink-0">
          Mitja CRM
        </Link>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "px-3 py-1.5 rounded-md text-sm shrink-0 transition-colors " +
                (active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900")
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
