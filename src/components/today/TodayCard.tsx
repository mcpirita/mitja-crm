import Link from "next/link";
import type { LeadRow, SegmentRow } from "@/lib/schemas";
import { LEAD_STATUS_LABELS_RU } from "@/lib/schemas";
import { STATUS_TONE } from "@/components/leads/StatusBadge";
import type { NextAction } from "@/lib/pipeline/getNextAction";

const URGENCY_TONE: Record<string, string> = {
  due: "amber",
  soon: "steel",
  later: "mute",
};

/** Цвет сигнальной планки слева: чем горячее, тем ярче. */
const URGENCY_SIGNAL: Record<string, string> = {
  due: "var(--amber)",
  soon: "rgba(111,159,208,.55)",
  later: "rgba(146,178,208,.2)",
  backlog: "rgba(146,178,208,.12)",
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
  // У бэклога бейджа нет вовсе: первое касание ничем не «горит».
  const showBadge = urgency !== null && urgency !== "backlog";
  const signal = (urgency && URGENCY_SIGNAL[urgency]) || URGENCY_SIGNAL.backlog;

  return (
    <Link
      href={`/leads/${lead.id}`}
      className="group relative block overflow-hidden rounded-[3px] border border-[var(--line)] bg-[linear-gradient(168deg,var(--panel)_0%,var(--bg-2)_100%)] p-3 pl-3.5 transition-colors duration-150 hover:border-[var(--line-str)] hover:bg-[rgba(146,178,208,.06)]"
    >
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[2px] transition-opacity duration-150 group-hover:opacity-100"
        style={{ background: signal, opacity: 0.75 }}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-[var(--text)] transition-colors group-hover:text-[var(--amber-hi)]">
            {lead.company}
          </div>
          {lead.name ? (
            <div className="mt-0.5 truncate font-mono text-[10.5px] text-[var(--dimmer)]">
              {lead.name}
            </div>
          ) : null}
        </div>
        {showBadge ? (
          <span
            className="chip shrink-0"
            data-tone={URGENCY_TONE[urgency] ?? "mute"}
          >
            {urgencyLabel(urgency)}
          </span>
        ) : null}
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-[.1em] text-[var(--dim)]">
          {resolveSegmentLabel(lead.segment, segments)}
        </span>
        <span className="h-2.5 w-px bg-[var(--line-str)]" aria-hidden />
        <span
          className="font-mono text-[10px] tracking-[.06em]"
          style={{ color: `var(--tone-${STATUS_TONE[lead.status]})` }}
        >
          {LEAD_STATUS_LABELS_RU[lead.status]}
        </span>
        {nextAction.due_date ? (
          <span className="ml-auto font-mono text-[10px] text-[var(--dimmer)]">
            {nextAction.days_waiting !== null && nextAction.days_waiting > 0
              ? `ждёт ${formatDaysRu(nextAction.days_waiting)}`
              : `срок ${formatDueShort(nextAction.due_date)}`}
          </span>
        ) : null}
      </div>
    </Link>
  );
}
