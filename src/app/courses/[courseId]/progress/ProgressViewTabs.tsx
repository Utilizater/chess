"use client";

// Page-specific tab wiring: holds which of Table/Tree is active and keeps
// it in the URL (?view=table|tree) so the tab survives a refresh or a
// shared link. `tableContent`/`treeContent` are rendered server-side by
// page.tsx and passed straight through — this component only toggles which
// one is visible, it doesn't fetch or compute anything itself.
//
// The tree visualization only makes sense with real screen real estate, so
// below the `lg` breakpoint the tab bar is hidden entirely and the table is
// forced visible regardless of `view` — including when a `?view=tree` link
// is opened on a phone, which otherwise would've landed on a canvas too
// small to use.

import { useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs } from "@/components/layout/Tabs";

export type ProgressView = "table" | "tree";

const TABS = [
  { value: "table" as const, label: "Table" },
  { value: "tree" as const, label: "Tree" },
];

export function ProgressViewTabs({
  initialView,
  tableContent,
  treeContent,
}: {
  initialView: ProgressView;
  tableContent: ReactNode;
  treeContent: ReactNode;
}) {
  const [view, setView] = useState<ProgressView>(initialView);
  // The tree canvas needs real (non-zero) dimensions the first time it
  // mounts for React Flow's initial fitView to compute a correct viewport,
  // so it can't just start hidden with `display: none`. Lazy-mount it the
  // first time its tab is actually selected, then keep it mounted (only
  // toggling visibility) so switching back doesn't re-run the ELK layout or
  // lose the current selection.
  const [treeMounted, setTreeMounted] = useState(initialView === "tree");
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (next: string) => {
    const nextView = next === "tree" ? "tree" : "table";
    setView(nextView);
    if (nextView === "tree") setTreeMounted(true);
    const query = nextView === "table" ? "" : `?view=${nextView}`;
    router.replace(`${pathname}${query}`, { scroll: false });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="hidden lg:block">
        <Tabs tabs={TABS} active={view} onChange={handleChange} />
      </div>
      {/* Visible on mobile no matter what `view` is; on lg+ it follows the tab. */}
      <div className={`block ${view === "table" ? "lg:block" : "lg:hidden"}`}>{tableContent}</div>
      {/* Never shown below lg, even if `view` is "tree" (e.g. a shared link). */}
      {treeMounted && <div className={`hidden ${view === "tree" ? "lg:block" : "lg:hidden"}`}>{treeContent}</div>}
    </div>
  );
}
