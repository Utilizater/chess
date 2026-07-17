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

/** Normalizes a FEN to the fields that define position identity, mirroring
 * src/lib/chess/fen.ts's normalizeFen. */
function normalizeFen(fen) {
  const [placement, sideToMove, castling, enPassant] = fen.trim().split(/\s+/);
  return [placement, sideToMove, castling, enPassant].join(" ");
}

/**
 * The *old* flat-lines engine (openingTrainer.ts's addOrMergeMove, before
 * this refactor) merged comments across lines sharing an edge: the first
 * line (in file order) to specify a non-empty comment on a given edge is
 * the one whose comment the trainer actually showed, regardless of which
 * line is currently being drilled. Reproduces that merge here, keyed by
 * (source fenKey, san), so validation checks the tree against what the
 * trainer actually rendered — not each line's own possibly-blank comment.
 */
function computeEffectiveComments(course) {
  const startingFen = resolveStartingFen(course.startingFen);
  const edgeComments = new Map();
  for (const line of course.lines) {
    const chess = new Chess(startingFen);
    for (const move of line.moves) {
      const key = `${normalizeFen(chess.fen())}|${move.san}`;
      if (move.comment && !edgeComments.get(key)) {
        edgeComments.set(key, move.comment);
      }
      chess.move(move.san);
    }
  }
  return edgeComments;
}

/** Replays every line's path from the root and checks it against the
 * original source lines: same SAN sequence, same effective (merged)
 * comments, and the complete set of line ids/tiers/names is preserved. */
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
  const effectiveComments = computeEffectiveComments(course);

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

    const replayChess = new Chess(resolveStartingFen(course.startingFen));
    for (let i = 0; i < sourceLine.moves.length; i += 1) {
      const key = `${normalizeFen(replayChess.fen())}|${sourceLine.moves[i].san}`;
      const expectedComment = effectiveComments.get(key) ?? undefined;
      const foundComment = foundLine.moves[i]?.comment ?? undefined;
      if (expectedComment !== foundComment) {
        errors.push(
          `Line "${id}" move ${i + 1} (${sourceLine.moves[i].san}) effective comment mismatch: ` +
            `expected "${expectedComment ?? ""}" got "${foundComment ?? ""}"`,
        );
      }
      replayChess.move(sourceLine.moves[i].san);
    }
  }

  return errors;
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
  const errors = validate(course, root);

  console.log(`Source: ${course.lines.length} lines`);
  console.log(`Tree:   ${countNodes(root)} nodes`);

  if (errors.length > 0) {
    console.error(`\nValidation FAILED with ${errors.length} error(s):`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log("Validation passed: line ids/names/tiers/descriptions and every move+comment round-trip exactly.");

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
