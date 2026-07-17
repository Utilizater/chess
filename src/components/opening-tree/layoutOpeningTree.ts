// Layout calculation, kept fully separate from rendering: this module knows
// nothing about React or React Flow. It takes the flat view-node list and
// returns a plain position map; OpeningTree.tsx is the only thing that
// turns that into actual React Flow nodes/edges.
//
// Runs entirely client-side via elkjs's bundled build, which falls back to
// an in-thread "fake worker" when no Worker is available/needed — no
// separate worker file or bundler config required.

import ELK from "elkjs/lib/elk.bundled.js";
import type { LayoutOptions } from "elkjs/lib/elk-api";
import { INTERMEDIATE_NODE_SIZE, TERMINAL_NODE_SIZE, type OpeningTreeViewNode } from "./openingTree.types";

const elk = new ELK();

// Top-to-bottom layered layout. Spacing is a bit more generous than the
// bare-minimum suggestion so terminal cards (the largest nodes) don't touch
// their neighbors once real content is in them.
const ELK_LAYOUT_OPTIONS: LayoutOptions = {
  "elk.algorithm": "layered",
  "elk.direction": "DOWN",
  "elk.spacing.nodeNode": "28",
  "elk.layered.spacing.nodeNodeBetweenLayers": "72",
  "elk.edgeRouting": "SPLINES",
};

export type OpeningTreeNodePosition = { x: number; y: number; width: number; height: number };
export type OpeningTreeLayout = Map<string, OpeningTreeNodePosition>;

function sizeFor(nodeType: OpeningTreeViewNode["nodeType"]) {
  return nodeType === "terminal" ? TERMINAL_NODE_SIZE : INTERMEDIATE_NODE_SIZE;
}

/** Computes a top-to-bottom layered layout for the given nodes via ELK.
 * Depends only on tree structure (ids, parent links, node type) — callers
 * should avoid re-invoking this when only selection or progress data
 * changes, since neither affects node size or graph shape. */
export async function computeOpeningTreeLayout(
  viewNodes: OpeningTreeViewNode[],
): Promise<OpeningTreeLayout> {
  if (viewNodes.length === 0) return new Map();

  const elkGraph = {
    id: "opening-tree-root",
    layoutOptions: ELK_LAYOUT_OPTIONS,
    children: viewNodes.map((node) => ({
      id: node.id,
      ...sizeFor(node.nodeType),
    })),
    edges: viewNodes
      .filter((node): node is OpeningTreeViewNode & { parentId: string } => Boolean(node.parentId))
      .map((node) => ({
        id: `${node.parentId}->${node.id}`,
        sources: [node.parentId],
        targets: [node.id],
      })),
  };

  const result = await elk.layout(elkGraph);

  const positions: OpeningTreeLayout = new Map();
  for (const child of result.children ?? []) {
    positions.set(child.id, {
      x: child.x ?? 0,
      y: child.y ?? 0,
      width: child.width ?? sizeFor("intermediate").width,
      height: child.height ?? sizeFor("intermediate").height,
    });
  }
  return positions;
}
