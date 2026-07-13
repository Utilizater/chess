// Pure, storage-agnostic derivation of learner-facing progress state from
// raw UserCourseProgressDoc counters. Nothing here touches MongoDB or React;
// see progressRepository.ts for persistence.

import type { LineProgress, UserCourseProgressDoc } from './progressTypes';

export type LineStatus =
  | 'not-started'
  | 'learning'
  | 'needs-review'
  | 'mastered';
export type CourseStatus = 'not-started' | 'learning' | 'mastered';

export type CourseProgressSummary = {
  status: CourseStatus;
  masteredLines: number;
  totalLines: number;
  /** 0-100, mastered lines as a percentage of the course's total lines. */
  percentComplete: number;
};

/**
 * A line counts as "mastered" the first time once it has this many
 * consecutive clean completions (no mistakes, no hints, in the same run).
 * Intentionally simple for now — it doesn't weigh how long ago mastery
 * happened or decay over time (see docs/BUSINESS.md §5 for where
 * spaced-repetition scheduling is headed). Retuning mastery only requires
 * changing this constant.
 */
export const MASTERY_CLEAN_STREAK = 2;

/**
 * Once a line has ever been mastered, a single clean completion is enough
 * to re-earn mastery after it regresses to "needs-review" — the learner has
 * already proven they know it, so we don't make them re-run the full streak.
 */
export const REMASTERY_CLEAN_STREAK = 1;

export function computeLineStatus(
  progress: LineProgress | undefined,
): LineStatus {
  if (!progress) return 'not-started';
  const hasActivity =
    progress.correctMoves > 0 ||
    progress.mistakes > 0 ||
    progress.hintsUsed > 0 ||
    progress.completions > 0;
  if (!hasActivity) return 'not-started';

  const requiredStreak = progress.everMastered
    ? REMASTERY_CLEAN_STREAK
    : MASTERY_CLEAN_STREAK;
  if (progress.cleanStreak >= requiredStreak) return 'mastered';
  return progress.everMastered ? 'needs-review' : 'learning';
}

/** Aggregates per-line status into a single course-level status/progress. */
export function computeCourseProgressSummary(
  lineIds: string[],
  doc: UserCourseProgressDoc | undefined,
): CourseProgressSummary {
  const totalLines = lineIds.length;
  const lineStatuses = lineIds.map((id) => computeLineStatus(doc?.lines[id]));
  const masteredLines = lineStatuses.filter(
    (status) => status === 'mastered',
  ).length;
  const startedLines = lineStatuses.filter(
    (status) => status !== 'not-started',
  ).length;

  const status: CourseStatus =
    totalLines > 0 && masteredLines === totalLines
      ? 'mastered'
      : startedLines > 0
        ? 'learning'
        : 'not-started';

  return {
    status,
    masteredLines,
    totalLines,
    percentComplete:
      totalLines > 0 ? Math.round((masteredLines / totalLines) * 100) : 0,
  };
}
