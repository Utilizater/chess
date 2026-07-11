import type { CourseStatus, LineStatus } from "@/lib/chess/progress";

const STATUS_STYLES: Record<
  CourseStatus | LineStatus,
  { badge: string; dot: string; label: string }
> = {
  "not-started": {
    badge: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
    dot: "bg-stone-400",
    label: "Not started",
  },
  learning: {
    badge: "bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300",
    dot: "bg-amber-500",
    label: "Learning",
  },
  mastered: {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300",
    dot: "bg-emerald-500",
    label: "Mastered",
  },
};

export function StatusBadge({ status }: { status: CourseStatus | LineStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
      {style.label}
    </span>
  );
}
