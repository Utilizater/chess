import type { Tier } from "@/lib/chess/openingTypes";
import { TIER_INFO } from "@/lib/chess/tiers";

// Deliberately disjoint from STATUS_STYLES in StatusBadge.tsx (stone/amber/
// emerald) so a line's tier and its mastery status never read as the same
// signal when shown side by side, e.g. in LineProgressTable.
export const TIER_STYLES: Record<
  Tier,
  { badge: string; dot: string; bar: string; ring: string; text: string; border: string }
> = {
  1: {
    badge: "bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300",
    dot: "bg-sky-500",
    bar: "bg-sky-500",
    ring: "ring-sky-400",
    text: "text-sky-700 dark:text-sky-300",
    border: "border-l-sky-500",
  },
  2: {
    badge: "bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300",
    dot: "bg-violet-500",
    bar: "bg-violet-500",
    ring: "ring-violet-400",
    text: "text-violet-700 dark:text-violet-300",
    border: "border-l-violet-500",
  },
  3: {
    badge: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-950/50 dark:text-fuchsia-300",
    dot: "bg-fuchsia-500",
    bar: "bg-fuchsia-500",
    ring: "ring-fuchsia-400",
    text: "text-fuchsia-700 dark:text-fuchsia-300",
    border: "border-l-fuchsia-500",
  },
};

export function TierBadge({ tier, locked }: { tier: Tier; locked?: boolean }) {
  if (locked) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-2.5 py-0.5 text-xs font-medium text-stone-400 dark:bg-stone-800 dark:text-stone-500">
        <span aria-hidden>🔒</span>
        {TIER_INFO[tier].name}
      </span>
    );
  }
  const style = TIER_STYLES[tier];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${style.badge}`}
    >
      <span aria-hidden className={`size-1.5 rounded-full ${style.dot}`} />
      {TIER_INFO[tier].name}
    </span>
  );
}

/** Compact per-tier dots for tight spaces (e.g. a course list card). */
export function TierDots({
  tiers,
}: {
  tiers: { tier: Tier; unlocked: boolean; masteredLines: number; totalLines: number; name: string }[];
}) {
  return (
    <div className="flex items-center gap-1">
      {tiers.map((t) => {
        const complete = t.totalLines > 0 && t.masteredLines === t.totalLines;
        return (
          <span
            key={t.tier}
            aria-hidden
            title={`${t.name}: ${t.unlocked ? `${t.masteredLines}/${t.totalLines} mastered` : "locked"}`}
            className={`size-2 rounded-full transition ${
              !t.unlocked
                ? "bg-stone-300 dark:bg-stone-700"
                : complete
                  ? TIER_STYLES[t.tier].dot
                  : `${TIER_STYLES[t.tier].dot} opacity-40`
            }`}
          />
        );
      })}
    </div>
  );
}
