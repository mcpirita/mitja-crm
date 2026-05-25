import Link from "next/link";
import type { LeadRow } from "@/lib/schemas";
import { SEGMENT_LABELS_RU, LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import type { NextAction } from "@/lib/pipeline/getNextAction";

const URGENCY_BADGE: Record<string, string> = {
  overdue: "bg-red-100 text-red-800 border-red-200",
  today: "bg-amber-100 text-amber-800 border-amber-200",
  soon: "bg-blue-100 text-blue-800 border-blue-200",
  later: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function urgencyLabel(u: NextAction["urgency"]): string {
  if (u === "overdue") return "просрочено";
  if (u === "today") return "сегодня";
  if (u === "soon") return "скоро";
  if (u === "later") return "позже";
  return "";
}

export function TodayCard({
  lead,
  nextAction,
}: {
  lead: LeadRow;
  nextAction: NextAction;
}) {
  const urgencyClass =
    nextAction.urgency && URGENCY_BADGE[nextAction.urgency]
      ? URGENCY_BADGE[nextAction.urgency]
      : "bg-zinc-100 text-zinc-700 border-zinc-200";

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 truncate">{lead.name}</div>
          <div className="text-sm text-zinc-600 truncate">{lead.company}</div>
        </div>
        {nextAction.urgency ? (
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${urgencyClass}`}
          >
            {urgencyLabel(nextAction.urgency)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
          {SEGMENT_LABELS_RU[lead.segment]}
        </span>
        <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200">
          {LEAD_STATUS_LABELS_RU[lead.status]}
        </span>
        {nextAction.due_date ? (
          <span className="text-zinc-500">до {nextAction.due_date}</span>
        ) : null}
      </div>
    </Link>
  );
}
