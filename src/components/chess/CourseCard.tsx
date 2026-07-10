import Link from "next/link";
import type { CourseSummary } from "@/lib/chess/openingRepository";

export function CourseCard({ course }: { course: CourseSummary }) {
  return (
    <Link
      href={`/courses/${course.id}`}
      className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:hover:border-slate-600"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
          {course.title}
        </h2>
        <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium capitalize text-slate-600 dark:bg-slate-700 dark:text-slate-300">
          Train {course.colorToTrain}
        </span>
      </div>
      {course.shortDescription && (
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
          {course.shortDescription}
        </p>
      )}
    </Link>
  );
}
