"use client";

// Course/progress-page container for the generic <OpeningTree>. This is the
// only piece that's allowed to know it's showing a specific course's
// progress-mode tree — the component it wraps stays reusable for future
// admin/explore surfaces. Selection state and the "practice" action live
// here, not in the reusable component.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OpeningTree } from "@/components/opening-tree/OpeningTree";
import type { OpeningTreeViewNode } from "@/components/opening-tree/openingTree.types";

export function CourseOpeningTreeSection({
  courseId,
  nodes,
}: {
  courseId: string;
  nodes: OpeningTreeViewNode[];
}) {
  const router = useRouter();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  return (
    <OpeningTree
      nodes={nodes}
      mode="progress"
      selectedNodeId={selectedNodeId}
      onNodeSelect={setSelectedNodeId}
      // No per-position entry point into the trainer exists yet (it always
      // starts from a weighted-random line at the course root) — this is
      // the closest existing route, per the "existing route, existing
      // handler, or disabled with a TODO" guidance. See
      // OpeningTreeDetails.tsx for the disabled-state fallback this enables.
      onPracticeFromPosition={() => router.push(`/courses/${courseId}`)}
    />
  );
}
