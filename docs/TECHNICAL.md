# Technical Documentation

For product context (what this is and why), see [docs/BUSINESS.md](./BUSINESS.md).

## 1. Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, React 19, TypeScript, strict mode) |
| Styling | Tailwind CSS 4 |
| Chess rules / FEN / SAN | [chess.js](https://github.com/jhlywa/chess.js) |
| Board UI | [react-chessboard](https://github.com/Clariity/react-chessboard) v5 |
| Data store | MongoDB (Atlas), via the official `mongodb` driver |
| Auth | [Clerk](https://clerk.com) |
| Course authoring | JSON files (seed data) → migrated into MongoDB via a one-off script |

No chess engine, no ORM — deliberately kept minimal.

## 2. Getting Started

### 2.1 Prerequisites

- Node.js 20+ (project developed against Node 24; `--env-file` support
  requires Node ≥20.6)
- A MongoDB connection string (Atlas or self-hosted)

### 2.2 Environment

Create a `.env` file in the project root:

```
MONGO_DB_URI=mongodb+srv://<user>:<password>@<cluster>/
```

`.env*` is git-ignored — never commit real credentials.

### 2.3 Install & seed

```bash
npm install
npm run seed:opening-tree   # uploads tree-shaped src/data/courses/*.json into MongoDB
```

Course content is authored as a move tree (a Trie — see [§5](#5-data-model));
`npm run seed:opening-tree` upserts every tree-shaped course JSON file (one
with a `root` array) into the `opening_tree` collection, keyed by `id`, so
re-running it is safe. It's the only supported way to get course JSON into
the database; the running app never reads the JSON files directly (see
[§3](#3-adding-a-new-course)).

Courses not yet migrated to the tree shape (still a flat `lines` array) are
skipped by `seed:opening-tree` and aren't part of the running app. The older
`npm run seed:courses` / `courses` collection pairing still exists for that
legacy shape but is no longer read by the app.

### 2.4 Run

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## 3. Adding a new course

1. Add a new JSON file under `src/data/courses/`, matching the `CourseTree`
   shape in [§5](#5-data-model) — a `root` array of move-tree nodes, with a
   `line` marker (including a `tier`, 1–3, see [§7](#7-learning-stages-tiers))
   on every node that ends a named line. `scripts/convertLinesToTree.mjs` can
   generate this from a flat `lines` array if you'd rather author that way
   first (see its header comment for usage).
2. Run `npm run seed:opening-tree` to upsert it into MongoDB.
3. It appears automatically on the home page and at `/courses/<id>` — no
   code changes needed. The course list and training page are both driven
   entirely by `courseRepository`, not by anything course-specific in the
   code.

To edit an *existing* course's tree without touching JSON files or
re-running the seed script, use the admin UI (see [§9](#9-admin-tooling))
instead.

## 4. Architecture

```
UI (pages/components)
        │  reads CourseTree / CourseSummary, calls trainer hooks
        ▼
useOpeningTrainer (React hook)         — session state, wires trainer logic to the board
        │  calls
        ▼
openingTrainer.ts (pure functions)     — walk tree, match moves, pick replies, hints
        │  operates on
        ▼
CourseTree.root (stored Trie) → OpeningTree (in-memory, position-keyed, built per page load)
        ▲
        │  CourseTree fetched via
courseRepository (openingRepository.ts)  — the only thing that knows about MongoDB
        │
        ▼
MongoDB (`chess_opening_trainer` DB, `opening_tree` collection)
```

The repository is the seam intended for future change: it's the only module
that imports the `mongodb` driver. If the storage backend ever changes
again, only `openingRepository.ts` and `src/lib/db/mongo.ts` should need to
change — nothing in `components/` or `app/` talks to Mongo directly.

## 5. Data model

Defined in `src/lib/chess/openingTypes.ts`.

```ts
type Tier = 1 | 2 | 3;   // 1 Foundation, 2 Advanced, 3 Master — see §7

type CourseTree = {
  id: string;
  title: string;
  shortDescription?: string;
  colorToTrain: "white" | "black";   // which side the trainee plays
  startingFen: string;               // "startpos" or a custom FEN
  root: OpeningTrieNode[];
};

// A node in the *stored/authored* move tree (a Trie): playing `san` from
// the parent's position leads here. Shared prefixes between lines are
// stored once; lines diverge into separate `children`.
type OpeningTrieNode = {
  san: string;
  uci?: string;
  comment?: string;      // shown as the "explanation" panel when this move is reached
  tags?: string[];       // unused today, reserved for future filtering
  children?: OpeningTrieNode[];
  // Present when a named, tiered line ends exactly at this node. A node can
  // have both `line` and `children` — e.g. a shorter line's ending can also
  // be a prefix of a longer line that keeps branching past it.
  line?: {
    id: string;           // must be unique within the course
    name: string;
    description?: string;
    tier: Tier;            // which learning stage this line belongs to
  };
};
```

Courses are stored and authored as an actual move tree — shared prefixes
(e.g. every Blackmar-Diemer line starting `1.d4 d5 2.e4 dxe4 3.Nc3 Nf6
4.f3`) are represented once, not repeated per line. The *runtime* engine
tree is a separate, derived, in-memory structure (`OpeningTree`, a
`Map<normalizedFen, OpeningTreeNode>`) built fresh from `CourseTree.root`
every time a training session starts (`buildOpeningTree` in
`openingTrainer.ts`), which walks the stored Trie and keys it by chess
position instead of by move path. Each runtime edge tracks every `lineId`
reachable through it (its own `line.id`, if any, plus every descendant's) —
that's how the app can tell you which named line(s) you're currently inside
of as you play. `collectLineSummaries` and `filterTreeByTier` (also in
`openingTrainer.ts`) walk the stored Trie directly for callers that just
need line metadata or a tier-pruned tree, without building the full runtime
engine tree.

**Position identity** uses a normalized FEN (`fen.ts`): piece placement,
side to move, castling rights, and en-passant square, with the half-move
clock and full-move number stripped off. Two positions reached via
different move orders or move counts are treated as the same tree node.

## 6. Learner progress

Defined in `src/lib/chess/progressTypes.ts` (data shape) and
`src/lib/chess/progress.ts` (pure status derivation).

Every training event — a correct move, a mistake (move attempted outside
the prepared tree), a hint/Show Answer use, or reaching "Line complete" —
is recorded via `POST /api/courses/[courseId]/progress`
(`{ lineId, kind, clean? }`), called from `useOpeningTrainer` through the
fire-and-forget `recordProgressEvent` helper in `progressClient.ts`. A
dropped event never blocks or fails the training UI.

`progressRepository.ts` (the only module that talks to the
`user_course_progress` collection) upserts one document per
`(userId, courseId)` pair:

```ts
type LineProgress = {
  correctMoves: number;
  mistakes: number;
  hintsUsed: number;
  completions: number;
  cleanStreak: number;   // consecutive completions with 0 mistakes/hints
  lastAttemptAt: Date;
};

type UserCourseProgressDoc = {
  userId: string;
  courseId: string;
  lines: Record<string, LineProgress>;  // keyed by a line marker's id in the opening tree
  createdAt: Date;
  updatedAt: Date;
};
```

`progress.ts` derives learner-facing status from those counters, storage-
and framework-agnostic like `openingTrainer.ts`:

- **Line status** — `not-started` (no recorded activity), `mastered` (
  `cleanStreak >= 3`), otherwise `learning`. The streak threshold is a
  single constant (`MASTERY_CLEAN_STREAK`); retuning mastery doesn't touch
  anything else.
- **Course status** (`computeCourseProgressSummary`) — `not-started` if no
  line has any activity, `mastered` if every line in the course is
  mastered, otherwise `learning`. Also returns `masteredLines`/`totalLines`
  and a `percentComplete` used for the progress bar on each `CourseCard` on
  the home page.

Each `CourseCard` also links to `GET /courses/[courseId]/progress`
(`src/app/courses/[courseId]/progress/page.tsx`), a read-only per-course
breakdown: the course-level status/percent, plus a `LineProgressTable`
listing every line with its own status and raw counters (correct moves,
mistakes, hints, completions, clean streak, last attempt date). This is
reachable straight from the course list, without entering a training
session — `getForUserAndCourse` in `progressRepository.ts` fetches the one
document needed rather than the full `listForUser` map the home page uses.
`LineProgressTable` is a small client component (`"use client"`, the sort
state can't live on the server) — every column header is clickable to sort
by it, toggling direction on repeat clicks; it defaults to "Last attempt",
descending.

This is an intentionally simple first cut — see
[docs/BUSINESS.md §5](./BUSINESS.md#5-vision-getting-to-spaced-repetition-not-just-random-drill)
for the fuller per-line scheduling this is a step toward.

## 7. Learning stages (tiers)

Defined in `src/lib/chess/tiers.ts`, pure and storage-agnostic like
`progress.ts`.

Every line belongs to one of three tiers — Foundation (1), Advanced (2),
Master (3) — authored directly on that line's marker in the course tree
(`OpeningTrieNode.line.tier`). Tier 2 unlocks once every Foundation line is
mastered; Tier 3 unlocks once every Advanced line is mastered. Tier 1 is
always unlocked, even with zero activity. `computeUnlockedTier` derives the
current unlock ceiling from a `UserCourseProgressDoc`; `computeTierProgress`
returns the full per-tier breakdown (mastered/total, locked/unlocked, which
tier is "current") used to render stage UI.

The unlock ceiling isn't just cosmetic: `useOpeningTrainer` prunes
`course.root` down to the unlocked tiers (`filterTreeByTier`) *before*
building the opening tree (`buildOpeningTree`), so a locked line's moves
never appear as a prepared opponent reply, and "Next Line" can never land on
one. Pruning drops a node's `line` marker if it's locked but keeps the node
(and its position in the tree) if an unlocked line still branches from it
further down — a locked line sharing a prefix with an unlocked one doesn't
remove that shared prefix, it just stops being its own "line complete"
stopping point. The hook takes the unlocked tier as an explicit argument
(`useOpeningTrainer(course, unlockedTier)`), computed server-side in
`app/courses/[courseId]/page.tsx` from that user's progress doc and passed
down through `ChessTrainerBoardLoader` → `ChessTrainerBoard`.

Stage UI lives in three components:

- `TierBadge.tsx` — a single tier chip, plus the sky/violet/fuchsia color
  palette every tier component shares (deliberately disjoint from
  `StatusBadge`'s stone/amber/emerald, so tier and mastery status never
  read as the same signal side by side) and `TierDots` for a compact
  multi-tier summary.
- `CourseStagePanel.tsx` — the collapsed "Stages" toggle on each home-page
  `CourseCard`; expands in place to the full per-tier breakdown. Kept
  outside the card's main `<Link>` so the toggle click doesn't also
  navigate.
- `StageOverview.tsx` — the full 3-card banner with a "?" explainer, used
  on the per-course progress page (`/courses/[courseId]/progress`). The
  training page itself only shows a compact `TierBadge` next to the course
  title, linking to the progress page for detail.

`LineProgressTable` also takes a `tier`/`locked` pair on each row: a
`TierBadge` in a dedicated Stage column, plus a `border-l-4` accent in that
tier's color on the row itself.

## 8. Data integrity & validation

Every stored move is validated as legal chess before it can be persisted:
`buildOpeningTree` walks `course.root` depth-first through a real
`chess.js` `Chess` instance (playing each node's move, recursing into its
children, then undoing) and throws on the first illegal move. This runs:

- On every page load of a training session (so a bad tree fails loudly
  instead of silently producing a broken runtime tree).
- On every admin save (`updateCourseTree` in `openingRepository.ts` rebuilds
  the tree with the candidate `root` *before* writing to MongoDB — an
  invalid move is rejected with a 400 and the database is left untouched).

## 9. Admin tooling

A minimal, unauthenticated editor for course content, meant for trusted
local/single-admin use — **do not expose this publicly without adding
auth first.**

- `GET /admin` — lists courses, links to each editor.
- `GET /admin/courses/[courseId]` — raw JSON textarea editor for that
  course's `root` move tree (`CourseTreeEditor.tsx`). Save does client-side
  `JSON.parse` first, then `PUT`s to the API route.
- `GET/PUT /api/admin/courses/[courseId]` (`route.ts`) — `GET` returns the
  full course document; `PUT` accepts `{ root: OpeningTrieNode[] }`,
  validates via `buildOpeningTree`, and either persists or returns a 400
  with the validation error.

## 10. Trainer session logic

`useOpeningTrainer` (`src/lib/chess/useOpeningTrainer.ts`) is the only React
hook that touches game state; it's a thin adapter over the pure functions in
`openingTrainer.ts` (tree building, move matching, opponent-reply selection,
hint/answer text, line-completion detection — none of which import React).
It also takes the caller-computed `unlockedTier` (see
[§7](#7-learning-stages-tiers)) and prunes `course.root` to it (via
`filterTreeByTier`) before building the runtime tree — every downstream
lookup in this hook operates on that pruned tree and the line summaries
`buildOpeningTree` returns alongside it, not the full course.

Session state machine (`TrainerStatus`):

| Status | Meaning |
|---|---|
| `your-move` | Waiting for the trainee to play a move |
| `opponent-thinking` | A prepared reply is about to auto-play (small delay for UX) |
| `incorrect` | Last attempted move wasn't in the tree for this position; trainee can immediately try again |
| `line-complete` | No further prepared moves at the current position |

A session starts by picking a random line to "bias" toward (for opponent
move selection and for labeling the current line), computed lazily in a
`useState` initializer rather than an effect — this matters because the
whole board is loaded via `next/dynamic` with `ssr: false`
(`ChessTrainerBoardLoader.tsx`): the random pick must never run on the
server, or the server-rendered line name would mismatch the client's,
producing a React hydration error. This bit us once during development; see
the `ssr: false` comment in that file if touching session initialization.

On any legal-but-unprepared move, the board simply doesn't update (the
`Chessboard`'s `onPieceDrop` returns `false`) and the panel shows "Not this
line." — the position is never mutated, so `canInteract`/`Restart Line`
always reflect real game state, never a rejected attempt.

## 11. Project structure

```
src/
  app/
    page.tsx                              Home: course list
    courses/[courseId]/page.tsx           Training page
    courses/[courseId]/progress/page.tsx  Per-course line-by-line progress table
    admin/                                Minimal course-editing UI
    api/admin/courses/[courseId]/         Admin write API
    api/courses/[courseId]/progress/      Progress-event write API
  components/
    chess/                         Board, panel, move list, course card,
                                    status badge, tier badge/panel/overview,
                                    line progress table
    admin/                         CourseTreeEditor
    layout/                        SiteHeader
  lib/
    chess/
      openingTypes.ts              Data model (CourseTree, OpeningTrieNode, runtime OpeningTree)
      fen.ts                       Position-identity normalization
      openingTrainer.ts            Pure trainer logic (build/walk tree, matching, hints)
      useOpeningTrainer.ts         React hook wiring trainer logic to the board
      openingRepository.ts         Data access layer (MongoDB-backed, opening_tree collection)
      progressTypes.ts             Learner progress data shape
      progress.ts                  Pure status derivation (line/course mastery)
      progressRepository.ts        Progress data access layer (MongoDB-backed)
      progressClient.ts            Client-side helper that POSTs progress events
      tiers.ts                     Pure tier/stage unlock logic
      pgnImport.ts                 PGN → OpeningMove[] helper (not wired into any UI yet)
    db/
      mongo.ts                     Cached MongoClient singleton
  data/
    courses/*.json                 Seed data, consumed only by scripts/seedOpeningTree.mjs
scripts/
  seedOpeningTree.mjs              Upserts tree-shaped seed JSON into the opening_tree collection
  convertLinesToTree.mjs           Converts a flat-lines course JSON file into the tree shape
  seedCourses.mjs                  Legacy: upserts flat-lines seed JSON into the (unused) courses collection
  addLineTiers.mjs                 Legacy: applied each line's tier to the flat-lines seed JSON files
  migrateCourseTiers.mjs           Legacy: backfilled tier onto flat lines already in MongoDB
```

## 12. Known simplifications (intentional, for a single-user MVP)

- Pawn promotion always defaults to queen (`attemptMove` in
  `openingTrainer.ts`) — covers the vast majority of opening-phase
  promotions without a promotion-choice UI.
- Opponent reply selection is uniform random, not weighted.
- No authentication on `/admin` — the rest of the app is behind Clerk, but
  the course editor is still a trusted-access tool (see §9).
- No spaced-repetition/scheduling layer — "Next Line" is a random pick, not
  a due-card queue. See [docs/BUSINESS.md §5](./BUSINESS.md#5-vision-getting-to-spaced-repetition-not-just-random-drill)
  for where this is headed.
- Mastery (§6) is a flat "3 clean completions in a row" rule with no decay
  over time and no per-mistake weighting — a good-enough signal for "has
  this been learned at all," not yet the graded difficulty a real
  scheduler would want.
- Stage unlocking (§7) is all-or-nothing per tier — every line in a tier
  must be mastered before the next unlocks, with no partial credit and no
  weighting by how hard a given line is.
