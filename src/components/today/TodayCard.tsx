import Link from "next/link";
import type { LeadRow, SegmentRow } from "@/lib/schemas";
import { LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import type { NextAction } from "@/lib/pipeline/getNextAction";

const URGENCY_BADGE: Record<string, string> = {
  due: "bg-amber-100 text-amber-800 border-amber-200",
  soon: "bg-blue-100 text-blue-800 border-blue-200",
  later: "bg-zinc-100 text-zinc-700 border-zinc-200",
};

function urgencyLabel(u: NextAction["urgency"]): string {
  if (u === "due") return "пора";
  if (u === "soon") return "скоро";
  if (u === "later") return "позже";
  return "";
}

/** 'YYYY-MM-DD' → 'DD.MM'. */
export function formatDueShort(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}.${m}`;
}

/** «16 дней» с правильным окончанием. */
export function formatDaysRu(n: number): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  let word = "дней";
  if (mod100 < 11 || mod100 > 14) {
    if (mod10 === 1) word = "день";
    else if (mod10 >= 2 && mod10 <= 4) word = "дня";
  }
  return `${n} ${word}`;
}

function resolveSegmentLabel(slug: string, segments?: SegmentRow[]): string {
  if (!segments) return slug;
  const row = segments.find((s) => s.slug === slug);
  return row ? row.label_ru : slug;
}

export function TodayCard({
  lead,
  nextAction,
  segments,
}: {
  lead: LeadRow;
  nextAction: NextAction;
  segments?: SegmentRow[];
}) {
  const urgency = nextAction.urgency;
  const badgeClass =
    urgency && URGENCY_BADGE[urgency]
      ? URGENCY_BADGE[urgency]
      : "bg-zinc-100 text-zinc-700 border-zinc-200";
  // У бэклога бейджа нет вовсе: первое касание ничем не «горит».
  const showBadge = urgency !== null && urgency !== "backlog";

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="block rounded-md border border-zinc-200 bg-white p-3 hover:border-zinc-400 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-zinc-900 truncate">{lead.company}</div>
          {lead.name ? (
            <div className="text-xs text-zinc-500 truncate">{lead.name}</div>
          ) : null}
        </div>
        {showBadge ? (
          <span
            className={`shrink-0 text-xs px-2 py-0.5 rounded-full border ${badgeClass}`}
          >
            {urgencyLabel(urgency)}
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-600">
        <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200">
          {resolveSegmentLabel(lead.segment, segments)}
        </span>
        <span className="px-2 py-0.5 rounded bg-zinc-50 border border-zinc-200">
          {LEAD_STATUS_LABELS_RU[lead.status]}
        </span>
        {nextAction.due_date ? (
          <span className="text-zinc-500">
            {nextAction.days_waiting !== null && nextAction.days_waiting > 0
              ? `ждёт ${formatDaysRu(nextAction.days_waiting)}`
              : `срок ${formatDueShort(nextAction.due_date)}`}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
