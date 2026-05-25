const BADGE_CLASSES: Record<string, string> = {
  amber: "bg-amber-100 text-amber-800 border-amber-200",
  lime: "bg-lime-100 text-lime-800 border-lime-200",
  rose: "bg-rose-100 text-rose-800 border-rose-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  stone: "bg-stone-100 text-stone-800 border-stone-200",
  blue: "bg-blue-100 text-blue-800 border-blue-200",
  zinc: "bg-zinc-100 text-zinc-700 border-zinc-200",
  emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
  teal: "bg-teal-100 text-teal-800 border-teal-200",
  purple: "bg-purple-100 text-purple-800 border-purple-200",
  indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
  pink: "bg-pink-100 text-pink-800 border-pink-200",
  sky: "bg-sky-100 text-sky-800 border-sky-200",
  cyan: "bg-cyan-100 text-cyan-800 border-cyan-200",
  fuchsia: "bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200",
  green: "bg-green-100 text-green-800 border-green-200",
  violet: "bg-violet-100 text-violet-800 border-violet-200",
  red: "bg-red-100 text-red-800 border-red-200",
};

const FALLBACK = BADGE_CLASSES.zinc;

interface Props {
  label: string;
  color: string;
}

export function SegmentBadge({ label, color }: Props) {
  const cls = BADGE_CLASSES[color] ?? FALLBACK;
  return (
    <span
      className={
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium " +
        cls
      }
    >
      {label}
    </span>
  );
}
