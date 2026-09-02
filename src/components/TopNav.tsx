"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS: { href: string; label: string }[] = [
  { href: "/today", label: "Сегодня" },
  { href: "/leads", label: "Лиды" },
  { href: "/spaces", label: "Помещения" },
  { href: "/templates", label: "Шаблоны" },
  { href: "/segments", label: "Сегменты" },
  { href: "/import", label: "Импорт" },
  { href: "/settings", label: "Настройки" },
];

export function TopNav({ authEnabled = false }: { authEnabled?: boolean }) {
  const pathname = usePathname();

  // На экране входа навигация не нужна.
  if (pathname === "/login") return null;

  return (
    <nav className="sticky top-0 z-20 w-full border-b border-[var(--line)] bg-[rgba(8,13,18,.92)] backdrop-blur-[14px]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 flex items-center gap-5 h-15 py-3">
        <Link href="/today" className="shrink-0 leading-none group">
          <span className="block font-display text-[19px] font-extrabold tracking-[.07em] bg-[linear-gradient(96deg,#fff_8%,var(--amber-hi)_58%,var(--amber)_100%)] bg-clip-text text-transparent">
            MITJA
            <span className="text-[var(--amber)] [-webkit-text-fill-color:var(--amber)]">.</span>
          </span>
          <span className="cap mt-[3px] block text-[8.5px] tracking-[.28em] transition-colors group-hover:text-[var(--dim)]">
            outreach control
          </span>
        </Link>

        <div className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {NAV_ITEMS.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={
                  "shrink-0 rounded-[2px] border px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] transition-all duration-150 " +
                  (active
                    ? "border-[rgba(232,161,60,.34)] bg-[var(--amber-soft)] text-[var(--amber-hi)]"
                    : "border-transparent text-[var(--dim)] hover:border-[var(--line)] hover:bg-[rgba(146,178,208,.05)] hover:text-[var(--text)]")
                }
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        {authEnabled ? (
          <form action="/api/auth/logout" method="post" className="ml-auto shrink-0">
            <button
              type="submit"
              className="rounded-[2px] border border-transparent px-2 py-1.5 font-mono text-[10px] uppercase tracking-[.16em] text-[var(--dimmer)] transition-colors hover:border-[var(--line)] hover:text-[var(--red)]"
            >
              выход
            </button>
          </form>
        ) : null}
      </div>
    </nav>
  );
}
