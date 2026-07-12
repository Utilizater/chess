// One-off script: adds a `tier` (1 = Foundation, 2 = Advanced, 3 = Master)
// to every line in the Blackmar-Diemer Gambit course JSON, both the seed
// copy (src/data/courses/) and the root working copy (test.json), so the
// two stay in sync. Safe to re-run — tier is looked up by line id and
// simply overwritten each time.
//
// Usage: node scripts/addLineTiers.mjs

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

// Tier assignment, by line id. Foundation = the small set of core tabiyas a
// learner should master before anything else; Advanced = named attacks/
// setups branching off each foundation defense; Master = countergambits,
// rare 4th-move sidelines, and other edge cases.
export const LINE_TIERS = {
  // Tier 1 — Foundation
  "accepted-bogoljubov": 1,
  "accepted-teichmann": 1,
  "ryder-gambit": 1,
  "declined-e6": 1,
  "declined-caro": 1,
  "declined-nf6": 1,

  // Tier 2 — Advanced
  "accepted-teichmann-bxf3-classical": 2,
  "accepted-teichmann-seidel-hall-g4": 2,
  "accepted-teichmann-bh5-retreat": 2,
  "accepted-teichmann-qf2-ciesielski": 2,
  "accepted-bogoljubov-studier-attack": 2,
  "accepted-bogoljubov-queenside-castle": 2,
  "accepted-bogoljubov-bd3-solid-black": 2,
  "accepted-euwe-bd3-c5": 2,
  "accepted-euwe-qd2-long-castle": 2,
  "accepted-gunderam-bf5-ne5": 2,
  "accepted-gunderam-bf5-bc4": 2,
  "accepted-ziegler-c6-bd3": 2,
  "accepted-ziegler-c6-bc4": 2,
  "accepted-pietrowsky-nc6": 2,
  "ryder-gambit-c6-qxd4": 2,
  "ryder-gambit-qxd4-qg4": 2,
  "ryder-gambit-e6-nc6": 2,
  "declined-french-structure-e6": 2,
  "declined-caro-structure-c6": 2,
  "declined-nf6-counterattack": 2,

  // Tier 3 — Master
  "accepted-euwe-zilbermints-gambit": 3,
  "accepted-euwe-h6-bh4": 3,
  "bdg-declined-lemberger-nxe4": 3,
  "bdg-declined-lemberger-dxe5-endgame": 3,
  "bdg-declined-lemberger-qh5": 3,
  "declined-netherlands-f5": 3,
  "bdg-fourth-move-bf5-vienna-fxe4": 3,
  "bdg-fourth-move-bf5-kampars": 3,
  "bdg-fourth-move-bf5-gunderam-h4": 3,
  "bdg-fourth-move-c6-okelly": 3,
  "bdg-fourth-move-c5-brombacher": 3,
  "bdg-fourth-move-e3-langeheinecke": 3,
  "bdg-fourth-move-e5-elbert": 3,
  "bdg-fourth-move-e6-weinsbach": 3,
  "bdg-studier-rasa-4be3": 3,
  "bdg-von-popiel-4bg5": 3,
};

function applyTiers(course) {
  const seen = new Set();
  const lines = course.lines.map((line) => {
    const tier = LINE_TIERS[line.id];
    if (!tier) {
      throw new Error(`No tier mapped for line id "${line.id}" in course "${course.id}"`);
    }
    seen.add(line.id);
    const { id, name, description, moves } = line;
    return description
      ? { id, name, description, tier, moves }
      : { id, name, tier, moves };
  });

  const unused = Object.keys(LINE_TIERS).filter((id) => !seen.has(id));
  if (unused.length > 0) {
    throw new Error(`Tier map has ids not present in course "${course.id}": ${unused.join(", ")}`);
  }

  return { ...course, lines };
}

async function updateFile(filePath, { preserveKeyOrder }) {
  const raw = await readFile(filePath, "utf-8");
  const course = JSON.parse(raw);
  const updated = applyTiers(course);

  // src/data/courses/*.json orders top-level keys id → colorToTrain →
  // lines → shortDescription → startingFen → title; test.json instead
  // leads with _id and keeps title/shortDescription/startingFen up top.
  const ordered = preserveKeyOrder
    ? updated
    : {
        _id: course._id,
        id: updated.id,
        colorToTrain: updated.colorToTrain,
        lines: updated.lines,
        shortDescription: updated.shortDescription,
        startingFen: updated.startingFen,
        title: updated.title,
      };

  await writeFile(filePath, JSON.stringify(ordered, null, 2) + "\n", "utf-8");
  console.log(`Tiered ${updated.lines.length} lines in ${path.relative(ROOT, filePath)}`);
}

async function main() {
  await updateFile(path.join(ROOT, "src", "data", "courses", "blackmar-diemer-gambit.json"), {
    preserveKeyOrder: true,
  });
  await updateFile(path.join(ROOT, "test.json"), { preserveKeyOrder: false });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
