import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StatusBadge } from "@/components/chess/StatusBadge";
import { LineProgressTable, type LineProgressRow } from "@/components/chess/LineProgressTable";
import { courseRepository } from "@/lib/chess/openingRepository";
import { progressRepository } from "@/lib/chess/progressRepository";
import { computeCourseProgressSummary, computeLineStatus } from "@/lib/chess/progress";

export const dynamic = "force-dynamic";

type CourseProgressPageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CourseProgressPage({ params }: CourseProgressPageProps) {
  const { userId } = await auth.protect();

  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);
  if (!course) {
    notFound();
  }

  const progressDoc = await progressRepository.getForUserAndCourse(userId, courseId);
  const lineIds = course.lines.map((line) => line.id);
  const summary = computeCourseProgressSummary(lineIds, progressDoc);

  const rows: LineProgressRow[] = course.lines.map((line) => {
    const lineProgress = progressDoc?.lines[line.id];
    return {
      id: line.id,
      name: line.name,
      description: line.description,
      status: computeLineStatus(lineProgress),
      correctMoves: lineProgress?.correctMoves ?? 0,
      mistakes: lineProgress?.mistakes ?? 0,
      hintsUsed: lineProgress?.hintsUsed ?? 0,
      completions: lineProgress?.completions ?? 0,
      cleanStreak: lineProgress?.cleanStreak ?? 0,
      lastAttemptAt: lineProgress?.lastAttemptAt,
    };
  });

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8 sm:px-6">
        <Link
          href="/"
          className="text-sm text-stone-500 transition hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500"
        >
          &larr; All courses
        </Link>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900 sm:text-3xl dark:text-stone-100">
              {course.title}
            </h1>
            <div className="mt-2 flex items-center gap-3">
              <StatusBadge status={summary.status} />
              <span className="text-sm text-stone-500 dark:text-stone-400">
                {summary.masteredLines}/{summary.totalLines} lines mastered (
                {summary.percentComplete}%)
              </span>
            </div>
          </div>
          <Link
            href={`/courses/${course.id}`}
            className="shrink-0 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-500"
          >
            Train this course &rarr;
          </Link>
        </div>

        <div className="mt-6">
          <LineProgressTable rows={rows} />
        </div>
      </main>
    </div>
  );
}
