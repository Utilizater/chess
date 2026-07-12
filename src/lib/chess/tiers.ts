// Pure, storage-agnostic logic for a course's three learning stages.
// Mirrors progress.ts in spirit: nothing here touches MongoDB or React.

import type { OpeningLine, Tier } from "./openingTypes";
import { computeLineStatus } from "./progress";
import type { UserCourseProgressDoc } from "./progressTypes";

/** The only fields tier logic needs — satisfied by a full OpeningLine or by
 * the trimmed shape returned in CourseSummary.lines. */
type TieredLine = Pick<OpeningLine, "id" | "tier">;

export const TIERS: Tier[] = [1, 2, 3];

export const TIER_INFO: Record<Tier, { name: string; blurb: string }> = {
  1: {
    name: "Foundation",
    blurb: "The core tabiyas of the course. Master these first.",
  },
  2: {
    name: "Advanced",
    blurb: "Named attacks and setups branching off the Foundation lines.",
  },
  3: {
    name: "Master",
    blurb: "Countergambits and rare sidelines for a complete repertoire.",
  },
};

/**
 * Highest tier currently unlocked for a learner: tier N+1 unlocks once
 * every line in tier N is mastered (see MASTERY_CLEAN_STREAK in
 * progress.ts). Tier 1 is always unlocked, even with zero activity.
 */
export function computeUnlockedTier(
  lines: TieredLine[],
  doc: UserCourseProgressDoc | undefined,
): Tier {
  let unlocked: Tier = 1;
  for (const tier of [1, 2] as Tier[]) {
    const linesInTier = lines.filter((line) => line.tier === tier);
    if (linesInTier.length === 0) continue;
    const allMastered = linesInTier.every(
      (line) => computeLineStatus(doc?.lines[line.id]) === "mastered",
    );
    if (!allMastered) break;
    unlocked = (tier + 1) as Tier;
  }
  return unlocked;
}

export type TierProgress = {
  tier: Tier;
  name: string;
  blurb: string;
  totalLines: number;
  masteredLines: number;
  unlocked: boolean;
  /** The tier the learner is actively working through right now. */
  current: boolean;
};

/** Per-tier breakdown, e.g. for a stage overview banner or progress table. */
export function computeTierProgress(
  lines: TieredLine[],
  doc: UserCourseProgressDoc | undefined,
): TierProgress[] {
  const unlockedTier = computeUnlockedTier(lines, doc);
  return TIERS.map((tier) => {
    const linesInTier = lines.filter((line) => line.tier === tier);
    const masteredLines = linesInTier.filter(
      (line) => computeLineStatus(doc?.lines[line.id]) === "mastered",
    ).length;
    return {
      tier,
      name: TIER_INFO[tier].name,
      blurb: TIER_INFO[tier].blurb,
      totalLines: linesInTier.length,
      masteredLines,
      unlocked: tier <= unlockedTier,
      current: tier === unlockedTier,
    };
  });
}
