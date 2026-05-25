import type { Segment } from "@/lib/schemas";
import { SEGMENT_LABELS_RU } from "@/lib/schemas";

const COLORS: Record<Segment, string> = {
  gastro: "bg-amber-100 text-amber-800 border-amber-200",
  services: "bg-violet-100 text-violet-800 border-violet-200",
  office: "bg-sky-100 text-sky-800 border-sky-200",
  entertainment: "bg-pink-100 text-pink-800 border-pink-200",
};

export function SegmentBadge({ segment }: { segment: Segment }) {
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium " +
        COLORS[segment]
      }
    >
      {SEGMENT_LABELS_RU[segment]}
    </span>
  );
}
