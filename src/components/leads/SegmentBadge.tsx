/** Цвет сегмента на тёмном — точка-маркер, а не пастельная плашка. */
const DOT_COLORS: Record<string, string> = {
  amber: "#e8a13c",
  lime: "#a3d75c",
  rose: "#e4738f",
  orange: "#ef8f4d",
  yellow: "#e8ce4a",
  stone: "#b3a89c",
  blue: "#6f9fd0",
  zinc: "#8b9fb1",
  emerald: "#4fc48a",
  teal: "#45bfae",
  purple: "#a97fe0",
  indigo: "#7f8ce8",
  pink: "#e878b5",
  sky: "#5eb8e8",
  cyan: "#5fc0c4",
  fuchsia: "#d878e0",
  green: "#7fc78c",
  violet: "#9b8ce4",
  red: "#e0603f",
};

const FALLBACK = DOT_COLORS.zinc;

interface Props {
  label: string;
  color: string;
}

export function SegmentBadge({ label, color }: Props) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap text-[12.5px] text-[var(--dim)]">
      <span
        className="segdot"
        style={{ background: DOT_COLORS[color] ?? FALLBACK }}
        aria-hidden
      />
      {label}
    </span>
  );
}
