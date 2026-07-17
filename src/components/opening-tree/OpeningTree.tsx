"use client";

// Generic, reusable opening-tree visualization. Renders a top-to-bottom
// layered graph of OpeningTreeViewNode[] via React Flow, with layout
// computed by ELK (see layoutOpeningTree.ts). Deliberately knows nothing
// about MongoDB, courses, or progress persistence — a page/container maps
// its own domain data into OpeningTreeViewNode[] and passes it in (see
// src/components/chess/CourseOpeningTreeSection.tsx for the one wiring
// this up to the progress page today).

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Background,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { IntermediateNode } from "./IntermediateNode";
import { TerminalNode } from "./TerminalNode";
import { OpeningTreeDetails } from "./OpeningTreeDetails";
import { computeOpeningTreeLayout, type OpeningTreeLayout } from "./layoutOpeningTree";
import { buildNodeIndex, getAncestorIds } from "./openingTree.utils";
import type { OpeningTreeFlowNode, OpeningTreeMode, OpeningTreeViewNode } from "./openingTree.types";

const NODE_TYPES = { intermediate: IntermediateNode, terminal: TerminalNode };

export type OpeningTreeProps = {
  nodes: OpeningTreeViewNode[];
  /** Controlled selection. Omit both this and onNodeSelect to let the
   * component manage selection internally. */
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  mode?: OpeningTreeMode;
  /** Left undefined to show the details panel's practice action disabled
   * with a TODO tooltip instead of navigating anywhere. */
  onPracticeFromPosition?: (node: OpeningTreeViewNode) => void;
  className?: string;
};

export function OpeningTree(props: OpeningTreeProps) {
  return (
    <ReactFlowProvider>
      <OpeningTreeCanvas {...props} />
    </ReactFlowProvider>
  );
}

function OpeningTreeCanvas({
  nodes: viewNodes,
  selectedNodeId,
  onNodeSelect,
  mode = "progress",
  onPracticeFromPosition,
  className,
}: OpeningTreeProps) {
  const { fitView } = useReactFlow();
  const [uncontrolledSelectedId, setUncontrolledSelectedId] = useState<string | null>(null);
  const isControlled = selectedNodeId !== undefined;
  const activeSelectedId = isControlled ? selectedNodeId : uncontrolledSelectedId;

  // Layout is stored alongside the structureKey it was computed for, and
  // both "loading" and "failed" are derived by comparing that stored key to
  // the current one — rather than eagerly resetting state at the top of the
  // effect — so the effect only ever calls setState from inside the async
  // callback (once the new layout/error actually lands), never
  // synchronously in the effect body itself.
  const [layoutResult, setLayoutResult] = useState<{ key: string; positions: OpeningTreeLayout } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  // Layout depends only on tree shape (ids/parents/node type), never on
  // selection or progress — this key stays stable across a progress update
  // or a click, so ELK never re-runs for those.
  const structureKey = useMemo(
    () => viewNodes.map((node) => `${node.id}:${node.parentId ?? "-"}:${node.nodeType}`).join("|"),
    [viewNodes],
  );

  useEffect(() => {
    let cancelled = false;
    computeOpeningTreeLayout(viewNodes)
      .then((result) => {
        if (!cancelled) setLayoutResult({ key: structureKey, positions: result });
      })
      .catch((error: unknown) => {
        console.error("Opening tree layout failed:", error);
        if (!cancelled) setFailedKey(structureKey);
      });
    return () => {
      cancelled = true;
    };
    // structureKey is the real dependency; viewNodes is intentionally left
    // out so a progress-only update (same shape, new object reference)
    // doesn't retrigger ELK.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  const layout = layoutResult?.key === structureKey ? layoutResult.positions : null;
  const layoutFailed = failedKey === structureKey;

  const nodesById = useMemo(() => buildNodeIndex(viewNodes), [viewNodes]);

  const highlightedPathIds = useMemo(() => {
    if (!activeSelectedId || !nodesById.has(activeSelectedId)) return null;
    return new Set(getAncestorIds(nodesById, activeSelectedId));
  }, [nodesById, activeSelectedId]);

  const handleSelect = useCallback(
    (id: string | null) => {
      if (onNodeSelect) onNodeSelect(id);
      if (!isControlled) setUncontrolledSelectedId(id);
    },
    [onNodeSelect, isControlled],
  );

  const { flowNodes, flowEdges } = useMemo(() => {
    if (!layout) return { flowNodes: [] as OpeningTreeFlowNode[], flowEdges: [] as Edge[] };

    const flowNodes: OpeningTreeFlowNode[] = viewNodes.map((node) => {
      const position = layout.get(node.id);
      const onPath = highlightedPathIds?.has(node.id) ?? false;
      return {
        id: node.id,
        type: node.nodeType,
        position: { x: position?.x ?? 0, y: position?.y ?? 0 },
        draggable: false,
        selectable: true,
        connectable: false,
        data: {
          node,
          isSelected: node.id === activeSelectedId,
          onPath,
          dimmed: Boolean(highlightedPathIds) && !onPath,
        },
      };
    });

    const flowEdges: Edge[] = viewNodes
      .filter((node): node is OpeningTreeViewNode & { parentId: string } => Boolean(node.parentId))
      .map((node) => {
        const onPath = Boolean(highlightedPathIds?.has(node.id) && highlightedPathIds?.has(node.parentId));
        const dimmed = Boolean(highlightedPathIds) && !onPath;
        return {
          id: `${node.parentId}->${node.id}`,
          source: node.parentId,
          target: node.id,
          type: "smoothstep",
          style: {
            stroke: onPath ? "#d97706" : "#d6d3d1",
            strokeWidth: onPath ? 2.5 : 1.25,
            opacity: dimmed ? 0.25 : 1,
            transition: "opacity 150ms ease, stroke 150ms ease",
          },
        };
      });

    return { flowNodes, flowEdges };
  }, [layout, viewNodes, highlightedPathIds, activeSelectedId]);

  const handleFitView = useCallback(() => {
    fitView({ padding: 0.15, duration: 250 });
  }, [fitView]);

  // Auto-fit once the tree first lays out (and whenever its shape changes).
  useEffect(() => {
    if (!layout) return;
    const frame = requestAnimationFrame(() => fitView({ padding: 0.15, duration: 0 }));
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey, layout !== null]);

  // Full-viewport takeover, toggled by the Expand button. A CSS overlay
  // rather than the browser Fullscreen API: no permission prompt, works the
  // same inside an iframe, and keeps our own toolbar/details panel exactly
  // as they are instead of handing chrome to the browser.
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsExpanded(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isExpanded]);

  // The canvas resizes when expanding/collapsing, so the current viewport
  // needs a re-fit — React Flow doesn't know the container just changed
  // size for reasons other than a window resize.
  useEffect(() => {
    if (!layout) return;
    const frame = requestAnimationFrame(() => fitView({ padding: 0.15, duration: 200 }));
    return () => cancelAnimationFrame(frame);
  }, [isExpanded, layout, fitView]);

  const selectedNode = activeSelectedId ? (nodesById.get(activeSelectedId) ?? null) : null;
  const selectedPath = useMemo(
    () => (selectedNode ? getAncestorIds(nodesById, selectedNode.id).map((id) => nodesById.get(id)!) : []),
    [nodesById, selectedNode],
  );

  if (viewNodes.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-1 items-center justify-center rounded-2xl border border-dashed border-stone-300 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
        No opening tree data to show yet.
      </div>
    );
  }

  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-50 flex flex-col gap-4 bg-[var(--background)] p-3 sm:p-4 lg:flex-row lg:items-stretch"
          : `flex flex-col gap-4 lg:flex-row lg:items-start ${className ?? ""}`
      }
    >
      <div
        className={`relative flex-1 overflow-hidden rounded-2xl border border-stone-300 bg-stone-100 shadow-sm dark:border-stone-700 dark:bg-stone-900 ${
          isExpanded ? "h-full min-h-0" : "h-[70vh] min-h-[480px]"
        }`}
      >
        {!layout && !layoutFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-100/80 text-sm text-stone-500 dark:bg-stone-900/80 dark:text-stone-400">
            Laying out the tree&hellip;
          </div>
        )}
        {layoutFailed && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-stone-100/90 px-6 text-center text-sm text-rose-600 dark:bg-stone-900/90 dark:text-rose-400">
            Couldn&apos;t lay out the opening tree. Try reloading the page.
          </div>
        )}
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          nodeTypes={NODE_TYPES}
          onNodeClick={(_event, node) => handleSelect(node.id)}
          onPaneClick={() => handleSelect(null)}
          proOptions={{ hideAttribution: true }}
          minZoom={0.08}
          maxZoom={1.5}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          fitView
        >
          <Background gap={28} size={1.5} color="#a8a29e" className="opacity-40 dark:opacity-30" />
          <Controls showInteractive={false} position="bottom-right" />
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            className="!border !border-stone-300 dark:!border-stone-600"
            maskColor="rgba(87, 83, 78, 0.2)"
          />
          <Panel position="top-right" className="flex gap-2">
            <button
              type="button"
              onClick={handleFitView}
              className="rounded-lg border border-stone-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-stone-900 dark:border-stone-600 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:text-stone-100"
            >
              Fit tree
            </button>
            <button
              type="button"
              onClick={() => setIsExpanded((value) => !value)}
              aria-pressed={isExpanded}
              className="rounded-lg border border-stone-300 bg-white/90 px-3 py-1.5 text-xs font-medium text-stone-600 shadow-sm backdrop-blur transition hover:bg-white hover:text-stone-900 dark:border-stone-600 dark:bg-stone-900/90 dark:text-stone-300 dark:hover:text-stone-100"
            >
              {isExpanded ? "⤡ Collapse" : "⤢ Expand"}
            </button>
          </Panel>
        </ReactFlow>
      </div>

      <OpeningTreeDetails
        node={selectedNode}
        path={selectedPath}
        mode={mode}
        onPracticeFromPosition={onPracticeFromPosition}
        onClose={() => handleSelect(null)}
      />
    </div>
  );
}
