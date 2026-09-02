import Link from "next/link";
import type { LeadRow as LeadRowType, SegmentRow } from "@/lib/schemas";
import { PRIORITY_LABELS_RU } from "@/lib/schemas";
import { SegmentBadge } from "./SegmentBadge";
import { StatusBadge } from "./StatusBadge";

function parseDate(value: string): Date | null {
  const d = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string): string {
  const d = parseDate(value);
  if (!d) return value;
  return d.toLocaleDateString("ru-RU", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
  });
}

/** «сегодня» / «3 дн» — насколько давно карточка не двигалась. */
function formatAgo(value: string): string | null {
  const d = parseDate(value);
  if (!d) return null;
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return "сегодня";
  if (days === 1) return "вчера";
  if (days < 30) return `${days} дн`;
  const months = Math.floor(days / 30);
  return `${months} мес`;
}

function resolveSegment(
  slug: string,
  segments: SegmentRow[],
): { label: string; color: string } {
  const row = segments.find((s) => s.slug === slug);
  if (row) return { label: row.label_ru, color: row.color };
  return { label: slug, color: "zinc" };
}

export function LeadRow({
  lead,
  segments,
  index,
}: {
  lead: LeadRowType;
  segments: SegmentRow[];
  index?: number;
}) {
  const seg = resolveSegment(lead.segment, segments);
  const ago = formatAgo(lead.updated_at);
  const stale = ago?.includes("мес") ?? false;

  return (
    <tr data-prio={lead.priority}>
      <td className="idx">
        {index !== undefined ? String(index + 1).padStart(2, "0") : ""}
      </td>
      <td>
        <div className="flex items-center gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="truncate text-[14px] font-medium text-[var(--text)] transition-colors hover:text-[var(--amber-hi)]"
          >
            {lead.company}
          </Link>
          {/* тип сделки — тихая пометка: «продажа» встречается в большинстве строк */}
          {lead.deal_type === "sale" ? (
            <span className="shrink-0 font-mono text-[9px] uppercase tracking-[.16em] text-[rgba(155,140,228,.75)]">
              продажа
            </span>
          ) : null}
        </div>
        {lead.name ? (
          <div className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--dimmer)]">
            {lead.name}
          </div>
        ) : null}
      </td>
      <td>
        <SegmentBadge label={seg.label} color={seg.color} />
      </td>
      <td>
        <StatusBadge status={lead.status} />
      </td>
      <td>
        <span
          className="prio"
          data-p={lead.priority}
          title={`Приоритет: ${PRIORITY_LABELS_RU[lead.priority]}`}
        >
          <i />
          <i />
          <i />
        </span>
      </td>
      <td className="whitespace-nowrap font-mono text-[11.5px] text-[var(--dim)]">
        {formatDate(lead.updated_at)}
        {ago ? (
          <span
            className={
              "ml-2 text-[10px] " +
              (stale ? "text-[rgba(224,96,63,.75)]" : "text-[var(--dimmer)]")
            }
          >
            {ago}
          </span>
        ) : null}
      </td>
      <td className="w-px pl-0 text-right">
        <Link
          href={`/leads/${lead.id}`}
          className="go inline-block px-1"
          aria-label={`Открыть ${lead.company}`}
        >
          →
        </Link>
      </td>
    </tr>
  );
}
