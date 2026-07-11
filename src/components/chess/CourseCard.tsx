import Link from "next/link";
import type { CourseSummary } from "@/lib/chess/openingRepository";

export function CourseCard({ course }: { course: CourseSummary }) {
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
