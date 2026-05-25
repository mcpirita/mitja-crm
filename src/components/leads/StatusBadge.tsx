import type { LeadStatus } from "@/lib/schemas";
import { LEAD_STATUS_LABELS_RU } from "@/lib/schemas";

const COLORS: Record<LeadStatus, string> = {
  new: "bg-zinc-100 text-zinc-700 border-zinc-200",
  contacted: "bg-blue-100 text-blue-800 border-blue-200",
  awaiting_reply: "bg-blue-50 text-blue-700 border-blue-200",
  fup1_sent: "bg-indigo-100 text-indigo-800 border-indigo-200",
  fup2_sent: "bg-indigo-200 text-indigo-900 border-indigo-300",
  replied_interested: "bg-emerald-100 text-emerald-800 border-emerald-200",
  replied_not_interested: "bg-rose-100 text-rose-800 border-rose-200",
  replied_later: "bg-yellow-100 text-yellow-800 border-yellow-200",
  meeting_scheduled: "bg-teal-100 text-teal-800 border-teal-200",
  viewing_done: "bg-cyan-100 text-cyan-800 border-cyan-200",
  in_negotiation: "bg-purple-100 text-purple-800 border-purple-200",
  won: "bg-green-200 text-green-900 border-green-300",
  lost: "bg-red-100 text-red-800 border-red-200",
  dead: "bg-zinc-200 text-zinc-700 border-zinc-300",
};

export function StatusBadge({ status }: { status: LeadStatus }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap " +
        COLORS[status]
      }
    >
      {LEAD_STATUS_LABELS_RU[status]}
    </span>
  );
}
