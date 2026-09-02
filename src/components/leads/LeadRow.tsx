import Link from "next/link";
import type { LeadRow as LeadRowType, SegmentRow } from "@/lib/schemas";
import { PRIORITY_LABELS_RU } from "@/lib/schemas";
import { SegmentBadge } from "./SegmentBadge";
import { StatusBadge } from "./StatusBadge";

function formatDate(value: string): string {
  const tryDate = new Date(value.replace(" ", "T") + (value.endsWith("Z") ? "" : "Z"));
  if (isNaN(tryDate.getTime())) return value;
  return tryDate.toLocaleDateString("ru-RU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

function resolveSegment(
  slug: string,
  segments: SegmentRow[],
): { label: string; color: string } {
  const row = segments.find((s) => s.slug === slug);
  if (row) return { label: row.label_ru, color: row.color };
  return { label: slug, color: "zinc" };
}

const PRIORITY_CLASSES: Record<LeadRowType["priority"], string> = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-zinc-100 text-zinc-600",
  low: "bg-zinc-50 text-zinc-400",
};

export function LeadRow({
  lead,
  segments,
}: {
  lead: LeadRowType;
  segments: SegmentRow[];
}) {
  const seg = resolveSegment(lead.segment, segments);
  return (
    <tr className="border-b border-zinc-200 hover:bg-zinc-50">
      <td className="px-3 py-2 align-middle">
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-zinc-900 hover:underline"
        >
          {lead.company}
        </Link>
        {lead.deal_type === "sale" ? (
          <span className="ml-2 rounded px-1.5 py-0.5 text-[11px] bg-violet-100 text-violet-800 align-middle">
            продажа
          </span>
        ) : null}
        {lead.name ? (
          <div className="text-xs text-zinc-500 mt-0.5">{lead.name}</div>
        ) : null}
      </td>
      <td className="px-3 py-2 align-middle">
        <SegmentBadge label={seg.label} color={seg.color} />
      </td>
      <td className="px-3 py-2 align-middle">
        <StatusBadge status={lead.status} />
      </td>
      <td className="px-3 py-2 align-middle">
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${PRIORITY_CLASSES[lead.priority]}`}
        >
          {PRIORITY_LABELS_RU[lead.priority]}
        </span>
      </td>
      <td className="px-3 py-2 align-middle text-sm text-zinc-600">
        {formatDate(lead.updated_at)}
      </td>
      <td className="px-3 py-2 align-middle text-right">
        <Link
          href={`/leads/${lead.id}`}
          className="text-sm text-blue-600 hover:underline"
        >
          Открыть
        </Link>
      </td>
    </tr>
  );
}
