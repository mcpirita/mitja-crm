import Link from "next/link";
import type { LeadRow as LeadRowType } from "@/lib/schemas";
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

export function LeadRow({ lead }: { lead: LeadRowType }) {
  return (
    <tr className="border-b border-zinc-200 hover:bg-zinc-50">
      <td className="px-3 py-2 align-middle">
        <Link
          href={`/leads/${lead.id}`}
          className="font-medium text-zinc-900 hover:underline"
        >
          {lead.name}
        </Link>
      </td>
      <td className="px-3 py-2 align-middle text-sm text-zinc-700">{lead.company}</td>
      <td className="px-3 py-2 align-middle">
        <SegmentBadge segment={lead.segment} />
      </td>
      <td className="px-3 py-2 align-middle">
        <StatusBadge status={lead.status} />
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
