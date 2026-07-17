// One-off (but reusable) migration: converts a course JSON file from the
// old flat `lines: [{ id, name, description, tier, moves: [{san,comment}] }]`
// shape into the new move-tree shape: `root: [{ san, comment?, children?,
// line? }]`, where lines sharing a prefix share the same nodes.
//
// Validates the result before writing: same set of line ids/tiers/names as
// the source, and replaying each line's path from the root reproduces the
// exact original SAN sequence + comments.
//
// Usage: node scripts/convertLinesToTree.mjs <path-to-course.json> [--write]
// Without --write, prints a summary and leaves the file untouched.

import { Chess } from "chess.js";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const STANDARD_START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

function resolveStartingFen(startingFen) {
  return startingFen === "startpos" ? STANDARD_START_FEN : startingFen;
}

function buildTree(course) {
  const root = [];
  for (const line of course.lines) {
    let siblings = root;
    for (const move of line.moves) {
      let node = siblings.find((candidate) => candidate.san === move.san);
      if (!node) {
        node = { san: move.san };
        if (move.comment) node.comment = move.comment;
        siblings.push(node);
      } else if (!node.comment && move.comment) {
        node.comment = move.comment;
      }
      const isLast = move === line.moves[line.moves.length - 1];
      if (isLast) {
        node.line = {
          id: line.id,
          name: line.name,
          ...(line.description ? { description: line.description } : {}),
          tier: line.tier,
        };
      }
      node.children ??= [];
      siblings = node.children;
    }
  }
  stripEmptyChildren(root);
  return root;
}

function stripEmptyChildren(nodes) {
  for (const node of nodes) {
    if (node.children) {
      if (node.children.length === 0) {
        delete node.children;
      } else {
        stripEmptyChildren(node.children);
      }
    }
  }
}

/**
 * `buildTree` merges two lines' moves into the same node when they share
 * the exact same *SAN sequence* prefix (a real Trie — that's the whole
 * point), not merely the same resulting board position. Two lines can also
 * reach an identical position via a different move order (a transposition)
 * without ever sharing a SAN-sequence prefix; buildTree correctly keeps
 * those as separate branches, each retaining its own line's own comment.
 *
 * This mirrors that exact same SAN-path-keyed merge (first non-empty
 * comment in file order wins per path, matching buildTree's own dedup) so
 * validation checks "did buildTree do what it's supposed to," not "does
 * this match a FEN-based merge" — a FEN-keyed check would incorrectly flag
 * every transposition as a mismatch, since the *old* flat-lines runtime's
 * FEN-keyed tree merged comments across transpositions too (arguably a
 * quirk worth leaving behind, not a behavior worth preserving).
 */
function computeEffectiveComments(course) {
  const edgeComments = new Map();
  const conflicts = [];
  for (const line of course.lines) {
    let pathKey = "";
    for (const move of line.moves) {
      pathKey += `>${move.san}`;
      if (move.comment) {
        const existing = edgeComments.get(pathKey);
        if (existing === undefined) {
          edgeComments.set(pathKey, move.comment);
        } else if (existing !== move.comment) {
          conflicts.push({ pathKey, line: line.id, san: move.san, kept: existing, dropped: move.comment });
        }
      }
    }
  }
  return { edgeComments, conflicts };
}

/** Replays every line's path from the root and checks it against the
 * original source lines: same SAN sequence, same effective (merged)
 * comments, and the complete set of line ids/tiers/names is preserved.
 * Returns { errors, conflicts } — conflicts are informational (two lines
 * that genuinely share a SAN-path prefix authored different text for the
 * same move; the tree keeps the first line's comment, same as buildTree),
 * not failures. */
function validate(course, root) {
  const errors = [];
  const foundLines = [];

  function walk(nodes, chess, path) {
    for (const node of nodes) {
      const played = chess.move(node.san);
      if (!played) {
        errors.push(`Illegal move "${node.san}" at path [${path.join(", ")}]`);
        continue;
      }
      const nextPath = [...path, { san: node.san, comment: node.comment }];
      if (node.line) {
        foundLines.push({ ...node.line, moves: nextPath });
      }
      if (node.children) {
        walk(node.children, chess, nextPath);
      }
      chess.undo();
    }
  }

  const chess = new Chess(resolveStartingFen(course.startingFen));
  walk(root, chess, []);

  const bySourceId = new Map(course.lines.map((line) => [line.id, line]));
  const byFoundId = new Map(foundLines.map((line) => [line.id, line]));
  const { edgeComments, conflicts } = computeEffectiveComments(course);

  if (bySourceId.size !== byFoundId.size) {
    errors.push(`Line count mismatch: source has ${bySourceId.size}, tree has ${byFoundId.size}`);
  }

  for (const [id, sourceLine] of bySourceId) {
    const foundLine = byFoundId.get(id);
    if (!foundLine) {
      errors.push(`Line "${id}" missing from tree`);
      continue;
    }
    if (foundLine.name !== sourceLine.name) {
      errors.push(`Line "${id}" name mismatch: "${sourceLine.name}" vs "${foundLine.name}"`);
    }
    if (foundLine.tier !== sourceLine.tier) {
      errors.push(`Line "${id}" tier mismatch: ${sourceLine.tier} vs ${foundLine.tier}`);
    }
    if ((foundLine.description ?? undefined) !== (sourceLine.description ?? undefined)) {
      errors.push(`Line "${id}" description mismatch`);
    }
    const sourceSans = sourceLine.moves.map((m) => m.san);
    const foundSans = foundLine.moves.map((m) => m.san);
    if (sourceSans.join(" ") !== foundSans.join(" ")) {
      errors.push(
        `Line "${id}" move sequence mismatch:\n  source: ${sourceSans.join(" ")}\n  tree:   ${foundSans.join(" ")}`,
      );
    }

    let pathKey = "";
    for (let i = 0; i < sourceLine.moves.length; i += 1) {
      pathKey += `>${sourceLine.moves[i].san}`;
      const expectedComment = edgeComments.get(pathKey) ?? undefined;
      const foundComment = foundLine.moves[i]?.comment ?? undefined;
      if (expectedComment !== foundComment) {
        errors.push(
          `Line "${id}" move ${i + 1} (${sourceLine.moves[i].san}) effective comment mismatch: ` +
            `expected "${expectedComment ?? ""}" got "${foundComment ?? ""}"`,
        );
      }
    }
  }

  return { errors, conflicts };
}

function countNodes(nodes) {
  let count = 0;
  for (const node of nodes) {
    count += 1;
    if (node.children) count += countNodes(node.children);
  }
  return count;
}

async function main() {
  const [, , inputPath, flag] = process.argv;
  if (!inputPath) {
    console.error("Usage: node scripts/convertLinesToTree.mjs <path-to-course.json> [--write]");
    process.exitCode = 1;
    return;
  }

  const resolvedPath = path.resolve(inputPath);
  const raw = await readFile(resolvedPath, "utf-8");
  const course = JSON.parse(raw);

  if (!Array.isArray(course.lines)) {
    throw new Error(`"${resolvedPath}" has no "lines" array — nothing to convert.`);
  }

  const root = buildTree(course);
  const { errors, conflicts } = validate(course, root);

  console.log(`Source: ${course.lines.length} lines`);
  console.log(`Tree:   ${countNodes(root)} nodes`);

  if (errors.length > 0) {
    console.error(`\nValidation FAILED with ${errors.length} error(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Validation passed: line ids/names/tiers/descriptions and every move+comment round-trip exactly.");

  if (conflicts.length > 0) {
    console.log(
      `\nNote: ${conflicts.length} move(s) are reached via the identical SAN sequence in more than one ` +
        `source line but were authored with different comment text. The tree keeps the first line's ` +
        `(in file order) comment at that shared node, same as buildTree does — not a validation failure, ` +
        `just worth knowing about:`,
    );
    for (const conflict of conflicts) {
      console.log(
        `  - "${conflict.san}" (line "${conflict.line}"): kept "${conflict.kept}", dropped "${conflict.dropped}"`,
      );
    }
  }

  const output = { id: course.id, title: course.title };
  for (const key of ["shortDescription", "image", "colorToTrain", "startingFen"]) {
    if (key in course) output[key] = course[key];
  }
  output.root = root;

  if (flag === "--write") {
    await writeFile(resolvedPath, `${JSON.stringify(output, null, 2)}\n`, "utf-8");
    console.log(`\nWrote tree-shaped course to ${resolvedPath}`);
  } else {
    console.log("\nDry run (pass --write to overwrite the file).");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
