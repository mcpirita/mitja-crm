import type { LeadStatus } from "@/lib/schemas";
import { LEAD_STATUS_LABELS_RU } from "@/lib/schemas";

export type Tone = "mute" | "steel" | "amber" | "violet" | "cyan" | "green" | "red";

/** Тон статуса: холодный — в работе, янтарь — ждёт нашего шага, зелёный/красный — исход. */
export const STATUS_TONE: Record<LeadStatus, Tone> = {
  new: "mute",
  contacted: "steel",
  awaiting_reply: "steel",
  fup1_sent: "amber",
  fup2_sent: "amber",
  replied_interested: "green",
  replied_not_interested: "red",
  replied_later: "violet",
  meeting_scheduled: "cyan",
  viewing_done: "cyan",
  in_negotiation: "violet",
  won: "green",
  lost: "red",
  dead: "mute",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span className="chip" data-tone={STATUS_TONE[status]}>
      {LEAD_STATUS_LABELS_RU[status]}
    </span>
  );
}
