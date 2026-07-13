import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChessTrainerBoardLoader } from "@/components/chess/ChessTrainerBoardLoader";
import { StageProgressBar } from "@/components/chess/StageProgressBar";
import { TierBadge } from "@/components/chess/TierBadge";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { courseRepository } from "@/lib/chess/openingRepository";
import { computeLineStatus } from "@/lib/chess/progress";
import { progressRepository } from "@/lib/chess/progressRepository";
import { computeTierProgress, computeUnlockedTier } from "@/lib/chess/tiers";

// Reads live, per-user progress to decide which stage is unlocked, so this
// page must not be statically frozen at build time.
export const dynamic = "force-dynamic";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { userId } = await auth.protect();

  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);

  if (!course) {
    notFound();
  }

  const progressDoc = await progressRepository.getForUserAndCourse(userId, courseId);
  const unlockedTier = computeUnlockedTier(course.lines, progressDoc);
  const lineStatuses = Object.fromEntries(
    course.lines.map((line) => [line.id, computeLineStatus(progressDoc?.lines[line.id])]),
  );
  const currentStageProgress = computeTierProgress(course.lines, progressDoc).find(
    (tier) => tier.current,
  );

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <Link
          href="/"
          className="text-sm text-stone-500 transition hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500"
        >
          &larr; All courses
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <h1 className="font-serif text-2xl font-semibold text-stone-900 sm:text-3xl dark:text-stone-100">
            {course.title}
          </h1>
          <Link href={`/courses/${course.id}/progress`} title="View stage progress">
            <TierBadge tier={unlockedTier} />
          </Link>
        </div>
        {currentStageProgress && (
          <Link
            href={`/courses/${course.id}/progress`}
            className="mt-2 inline-block w-fit"
            title="View stage progress"
          >
            <StageProgressBar tier={currentStageProgress} />
          </Link>
        )}
      </div>
      <ChessTrainerBoardLoader
        course={course}
        unlockedTier={unlockedTier}
        lineStatuses={lineStatuses}
      />
    </div>
  );
}
