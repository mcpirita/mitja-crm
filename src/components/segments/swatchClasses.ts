import type { SegmentColor } from "@/lib/schemas";

/**
 * Образцы цвета сегмента. На тёмном фоне пастель не читается,
 * поэтому берём насыщенные шаги 400/500 — они не переопределены
 * под алерты в globals.css.
 */
export const SWATCH_CLASSES: Record<SegmentColor, string> = {
  amber: "bg-amber-400 border-amber-500",
  lime: "bg-lime-400 border-lime-500",
  rose: "bg-rose-400 border-rose-500",
  orange: "bg-orange-400 border-orange-500",
  yellow: "bg-yellow-400 border-yellow-500",
  stone: "bg-stone-400 border-stone-500",
  blue: "bg-blue-400 border-blue-500",
  zinc: "bg-slate-400 border-slate-500",
  emerald: "bg-emerald-400 border-emerald-500",
  teal: "bg-teal-400 border-teal-500",
  purple: "bg-purple-400 border-purple-500",
  indigo: "bg-indigo-400 border-indigo-500",
  pink: "bg-pink-400 border-pink-500",
  sky: "bg-sky-400 border-sky-500",
  cyan: "bg-cyan-400 border-cyan-500",
  fuchsia: "bg-fuchsia-400 border-fuchsia-500",
  green: "bg-green-400 border-green-500",
  violet: "bg-violet-400 border-violet-500",
  red: "bg-red-400 border-red-500",
};
