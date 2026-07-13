import type { TierProgress } from "@/lib/chess/tiers";
import { TIER_STYLES } from "./TierBadge";

/**
 * Compact, single-stage progress bar for the course training screen: just
 * the current stage's mastered/total lines, not the full per-stage
 * breakdown (that lives on the dedicated progress page).
 */
export function StageProgressBar({ tier }: { tier: TierProgress }) {
  const percent =
    tier.totalLines > 0 ? Math.round((tier.masteredLines / tier.totalLines) * 100) : 0;
  const style = TIER_STYLES[tier.tier];

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
        <div
          className={`h-full rounded-full transition-[width] ${style.bar}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-stone-500 dark:text-stone-400">
        {tier.masteredLines}/{tier.totalLines} &middot; {percent}%
      </span>
    </div>
  );
}
