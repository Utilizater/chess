"use client";

import { useState } from "react";
import type { TierProgress } from "@/lib/chess/tiers";
import { TIER_STYLES } from "./TierBadge";

export function StageOverview({ tiers }: { tiers: TierProgress[] }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Learning stages
        </h2>
        <button
          type="button"
          onClick={() => setShowInfo((value) => !value)}
          aria-expanded={showInfo}
          aria-label="How stages work"
          className="flex size-5 shrink-0 items-center justify-center rounded-full border border-stone-300 text-xs font-semibold text-stone-500 transition hover:border-amber-400 hover:text-amber-700 dark:border-stone-600 dark:text-stone-400 dark:hover:border-amber-600 dark:hover:text-amber-500"
        >
          ?
        </button>
      </div>

      {showInfo && (
        <p className="mt-2 rounded-lg border-l-2 border-amber-400 bg-amber-50/60 p-3 text-xs leading-relaxed text-stone-600 dark:border-amber-600 dark:bg-amber-950/20 dark:text-stone-300">
          Every course is split into three stages of increasing difficulty.
          You start on <strong>Foundation</strong>. A stage unlocks once
          you&apos;ve mastered every line in the stage before it &mdash;
          three clean run-throughs in a row, with no mistakes or hints.
          Locked lines stay out of your drills entirely, including the
          opponent&apos;s replies, so you&apos;ll never get quizzed on
          something you haven&apos;t unlocked yet.
        </p>
      )}

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {tiers.map((tier) => {
          const style = TIER_STYLES[tier.tier];
          const percent =
            tier.totalLines > 0 ? Math.round((tier.masteredLines / tier.totalLines) * 100) : 0;
          const complete = tier.totalLines > 0 && tier.masteredLines === tier.totalLines;

          return (
            <div
              key={tier.tier}
              className={`rounded-xl border p-3 transition ${
                tier.current
                  ? `border-transparent bg-stone-50 ring-2 ${style.ring} dark:bg-stone-800/60`
                  : "border-stone-200 dark:border-stone-700"
              } ${!tier.unlocked ? "opacity-60" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden className={`size-2 rounded-full ${style.dot}`} />
                <span className={`text-xs font-semibold uppercase tracking-wide ${style.text}`}>
                  Stage {tier.tier} &middot; {tier.name}
                </span>
                {!tier.unlocked && (
                  <span aria-hidden className="ml-auto text-stone-400 dark:text-stone-500">
                    🔒
                  </span>
                )}
                {tier.unlocked && complete && (
                  <span aria-hidden className="ml-auto text-emerald-500">
                    ✓
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
                {tier.unlocked
                  ? `${tier.masteredLines}/${tier.totalLines} lines mastered`
                  : "Locked — master the previous stage to unlock"}
              </p>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
                <div
                  className={`h-full rounded-full transition-[width] ${style.bar}`}
                  style={{ width: `${tier.unlocked ? percent : 0}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
