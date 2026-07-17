import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { StatusBadge } from "@/components/chess/StatusBadge";
import { StageOverview } from "@/components/chess/StageOverview";
import { LineProgressTable, type LineProgressRow } from "@/components/chess/LineProgressTable";
import { CourseOpeningTreeSection } from "@/components/chess/CourseOpeningTreeSection";
import { courseRepository } from "@/lib/chess/openingRepository";
import { collectLineSummaries } from "@/lib/chess/openingTrainer";
import { mapCourseTreeToViewNodes } from "@/lib/chess/openingTreeView";
import { progressRepository } from "@/lib/chess/progressRepository";
import { computeCourseProgressSummary, computeLineStatus } from "@/lib/chess/progress";
import { computeTierProgress, computeUnlockedTier } from "@/lib/chess/tiers";
import { ProgressViewTabs, type ProgressView } from "./ProgressViewTabs";

export const dynamic = "force-dynamic";

type CourseProgressPageProps = {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function CourseProgressPage({ params, searchParams }: CourseProgressPageProps) {
  const { userId } = await auth.protect();

  const { courseId } = await params;
  const { view } = await searchParams;
  const initialView: ProgressView = view === "tree" ? "tree" : "table";

  const course = await courseRepository.getCourseById(courseId);
  if (!course) {
    notFound();
  }

  const progressDoc = await progressRepository.getForUserAndCourse(userId, courseId);
  const lines = collectLineSummaries(course.root);
  const lineIds = lines.map((line) => line.id);
  const summary = computeCourseProgressSummary(lineIds, progressDoc);
  const unlockedTier = computeUnlockedTier(lines, progressDoc);
  const tierProgress = computeTierProgress(lines, progressDoc);

  const rows: LineProgressRow[] = lines.map((line) => {
    const lineProgress = progressDoc?.lines[line.id];
    return {
      id: line.id,
      name: line.name,
      description: line.description,
      tier: line.tier,
      locked: line.tier > unlockedTier,
      status: computeLineStatus(lineProgress),
      correctMoves: lineProgress?.correctMoves ?? 0,
      mistakes: lineProgress?.mistakes ?? 0,
      hintsUsed: lineProgress?.hintsUsed ?? 0,
      completions: lineProgress?.completions ?? 0,
      cleanStreak: lineProgress?.cleanStreak ?? 0,
      lastAttemptAt: lineProgress?.lastAttemptAt,
    };
  });

  const treeViewNodes = mapCourseTreeToViewNodes(course.root, course.startingFen, progressDoc);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
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
          <StageOverview tiers={tierProgress} />
        </div>

        <div className="mt-6">
          <ProgressViewTabs
            initialView={initialView}
            tableContent={<LineProgressTable rows={rows} />}
            treeContent={<CourseOpeningTreeSection courseId={course.id} nodes={treeViewNodes} />}
          />
        </div>
      </main>
    </div>
  );
}
