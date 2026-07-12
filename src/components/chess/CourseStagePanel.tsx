"use client";

// Collapsed by default so a course list of several cards doesn't turn into
// a wall of stage detail; expands in place to the full 3-stage breakdown
// on click. Lives outside CourseCard's main <Link> (nested interactive
// elements aren't valid HTML and would fire an accidental navigation on
// every toggle click) — see how CourseCard wires this up.

import { useState } from "react";
import type { TierProgress } from "@/lib/chess/tiers";
import { TierDots, TIER_STYLES } from "./TierBadge";

export function CourseStagePanel({ tiers }: { tiers: TierProgress[] }) {
  const [expanded, setExpanded] = useState(false);
  const currentTier = tiers.find((tier) => tier.current);

  return (
    <div>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 text-left"
      >
        <TierDots tiers={tiers} />
        {currentTier && (
          <span className="text-xs text-stone-500 dark:text-stone-400">
            Stage {currentTier.tier}/3 &middot; {currentTier.name}
          </span>
        )}
        <span className="ml-auto flex items-center gap-1 text-xs font-medium text-stone-500 transition hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500">
          Stages
          <span
            aria-hidden
            className={`text-[10px] transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            ▾
          </span>
        </span>
      </button>

      {expanded && (
        <div className="mt-3 flex flex-col gap-2">
          {tiers.map((tier) => {
            const style = TIER_STYLES[tier.tier];
            const complete = tier.totalLines > 0 && tier.masteredLines === tier.totalLines;
            const percent =
              tier.totalLines > 0 ? Math.round((tier.masteredLines / tier.totalLines) * 100) : 0;

            return (
              <div key={tier.tier} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden
                  className={`size-1.5 shrink-0 rounded-full ${
                    tier.unlocked ? style.dot : "bg-stone-300 dark:bg-stone-700"
                  }`}
                />
                <span
                  className={`w-28 shrink-0 font-medium ${
                    tier.unlocked ? style.text : "text-stone-400 dark:text-stone-500"
                  }`}
                >
                  Stage {tier.tier} &middot; {tier.name}
                </span>
                {tier.unlocked ? (
                  <>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                      <div
                        className={`h-full rounded-full ${style.bar}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="shrink-0 tabular-nums text-stone-500 dark:text-stone-400">
                      {complete ? "✓" : `${tier.masteredLines}/${tier.totalLines}`}
                    </span>
                  </>
                ) : (
                  <span className="text-stone-400 dark:text-stone-500">🔒 locked</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
