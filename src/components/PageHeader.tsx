import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="rise mb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-5">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span className="cap cap-amber">///</span>
            <h1 className="font-display text-[clamp(21px,3vw,27px)] font-bold leading-none tracking-[.03em] text-[var(--text)]">
              {title}
            </h1>
          </div>
          {description ? (
            <p className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-[var(--dim)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      <div className="mt-4 h-px bg-[linear-gradient(90deg,var(--line-str),transparent)]" />
    </header>
  );
}
