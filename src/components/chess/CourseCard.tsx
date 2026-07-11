import Link from "next/link";
import type { CourseSummary } from "@/lib/chess/openingRepository";
import type { CourseProgressSummary, CourseStatus } from "@/lib/chess/progress";

const STATUS_STYLES: Record<CourseStatus, { badge: string; dot: string; label: string }> = {
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

export function CourseCard({
  course,
  progress,
}: {
  course: CourseSummary;
  progress: CourseProgressSummary;
}) {
  const statusStyle = STATUS_STYLES[progress.status];

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-700"
    >
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-2xl text-amber-700 dark:bg-amber-950/60 dark:text-amber-500"
      >
        ♟
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
            {course.title}
          </h2>
          <span className="shrink-0 rounded-full bg-stone-100 px-3 py-1 text-xs font-medium capitalize text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            Train {course.colorToTrain}
          </span>
        </div>
        {course.shortDescription && (
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            {course.shortDescription}
          </p>
        )}

        <div className="mt-3 flex items-center gap-3">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle.badge}`}
          >
            <span aria-hidden className={`size-1.5 rounded-full ${statusStyle.dot}`} />
            {statusStyle.label}
          </span>
          {progress.totalLines > 0 && (
            <span className="text-xs text-stone-500 dark:text-stone-400">
              {progress.masteredLines}/{progress.totalLines} lines mastered
            </span>
          )}
        </div>

        {progress.totalLines > 0 && (
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-[width]"
              style={{ width: `${progress.percentComplete}%` }}
            />
          </div>
        )}
      </div>

      <span
        aria-hidden
        className="shrink-0 text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-amber-600 dark:text-stone-600 dark:group-hover:text-amber-500"
      >
        &rarr;
      </span>
    </Link>
  );
}
