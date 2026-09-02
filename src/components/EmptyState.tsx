import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="panel rise px-8 py-12 text-center">
      <div className="cap cap-amber mb-3">канал пуст</div>
      <h2 className="font-display text-[17px] font-bold tracking-[.03em] text-[var(--text)]">
        {title}
      </h2>
      {description ? (
        <p className="mx-auto mt-2.5 max-w-md text-[13.5px] leading-relaxed text-[var(--dim)]">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
