import Image from "next/image";
import Link from "next/link";
import type { CourseSummary } from "@/lib/chess/openingRepository";
import type { CourseProgressSummary } from "@/lib/chess/progress";
import type { TierProgress } from "@/lib/chess/tiers";
import { CourseStagePanel } from "./CourseStagePanel";
import { StatusBadge } from "./StatusBadge";

export function CourseCard({
  course,
  progress,
  tiers,
}: {
  course: CourseSummary;
  progress: CourseProgressSummary;
  tiers: TierProgress[];
}) {
  return (
    <div className="group rounded-xl border border-stone-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md dark:border-stone-700 dark:bg-stone-900 dark:hover:border-amber-700">
      <Link href={`/courses/${course.id}`} className="flex items-center gap-4">
        {course.image ? (
          <Image
            src={course.image}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <span
            aria-hidden
            className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-3xl text-amber-700 dark:bg-amber-950/60 dark:text-amber-500"
          >
            ♟
          </span>
        )}

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
            <StatusBadge status={progress.status} />
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

      {tiers.length > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
          <CourseStagePanel tiers={tiers} />
        </div>
      )}

      {progress.totalLines > 0 && (
        <div className="mt-3 border-t border-stone-100 pt-3 dark:border-stone-800">
          <Link
            href={`/courses/${course.id}/progress`}
            className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500"
          >
            View line-by-line progress &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}
