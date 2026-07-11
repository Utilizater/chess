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
| Course authoring | JSON files (seed data) → migrated into MongoDB via a one-off script |

No chess engine, no auth provider, no ORM — deliberately kept minimal for a
single-user tool.

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
npm run seed:courses   # uploads src/data/courses/*.json into MongoDB
```

The seed script is idempotent — it upserts each course by its `id`, so
re-running it is safe and just overwrites the seeded copy. It's the only
supported way to get course JSON into the database; the running app never
reads the JSON files directly (see [§3](#3-adding-a-new-course)).

### 2.4 Run

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## 3. Adding a new course

1. Add a new JSON file under `src/data/courses/`, matching the `Course`
   shape in [§5](#5-data-model).
2. Run `npm run seed:courses` to upsert it into MongoDB.
3. It appears automatically on the home page and at `/courses/<id>` — no
   code changes needed. The course list and training page are both driven
   entirely by `courseRepository`, not by anything course-specific in the
   code.

To edit an *existing* course's lines without touching JSON files or
re-running the seed script, use the admin UI (see [§7](#7-admin-tooling))
instead.

## 4. Architecture

```
UI (pages/components)
        │  reads Course / CourseSummary, calls trainer hooks
        ▼
useOpeningTrainer (React hook)         — session state, wires trainer logic to the board
        │  calls
        ▼
openingTrainer.ts (pure functions)     — build tree, match moves, pick replies, hints
        │  operates on
        ▼
Course → OpeningTree (in-memory, built per page load from Course.lines)
        ▲
        │  Course fetched via
courseRepository (openingRepository.ts)  — the only thing that knows about MongoDB
        │
        ▼
MongoDB (`chess_opening_trainer` DB, `courses` collection)
```

The repository is the seam intended for future change: it's the only module
that imports the `mongodb` driver. If the storage backend ever changes
again, only `openingRepository.ts` and `src/lib/db/mongo.ts` should need to
change — nothing in `components/` or `app/` talks to Mongo directly.

## 5. Data model

Defined in `src/lib/chess/openingTypes.ts`.

```ts
type Course = {
  id: string;
  title: string;
  shortDescription?: string;
  colorToTrain: "white" | "black";   // which side the trainee plays
  startingFen: string;               // "startpos" or a custom FEN
  lines: OpeningLine[];
};

type OpeningLine = {
  id: string;            // must be unique within the course
  name: string;
  description?: string;
  moves: OpeningMove[];  // SAN sequence from startingFen
};

type OpeningMove = {
  san: string;
  uci?: string;
  comment?: string;      // shown as the "explanation" panel when this move is reached
  tags?: string[];       // unused today, reserved for future filtering
};
```

Courses are stored and authored as flat SAN sequences per line — there's no
manual tree-building involved in authoring. The tree itself is a derived,
in-memory structure (`OpeningTree`, a `Map<normalizedFen, OpeningTreeNode>`)
built fresh from `Course.lines` every time a training session starts
(`buildOpeningTree` in `openingTrainer.ts`). Lines that share a prefix (e.g.
two different lines both starting `1.d4 d5 2.e4`) automatically merge into
shared tree edges, and each edge tracks every `lineId` that passes through
it — that's how the app can tell you which named line(s) you're currently
inside of as you play.

**Position identity** uses a normalized FEN (`fen.ts`): piece placement,
side to move, castling rights, and en-passant square, with the half-move
clock and full-move number stripped off. Two positions reached via
different move orders or move counts are treated as the same tree node.

## 6. Data integrity & validation

Every line is validated as legal chess before it can be persisted:
`buildOpeningTree` replays each line's SAN sequence through a real
`chess.js` `Chess` instance and throws on the first illegal move. This runs:

- On every page load of a training session (so a bad line fails loudly
  instead of silently producing a broken tree).
- On every admin save (`updateCourseLines` in `openingRepository.ts` rebuilds
  the tree with the candidate lines *before* writing to MongoDB — an invalid
  line is rejected with a 400 and the database is left untouched).

## 7. Admin tooling

A minimal, unauthenticated editor for course content, meant for trusted
local/single-admin use — **do not expose this publicly without adding
auth first.**

- `GET /admin` — lists courses, links to each editor.
- `GET /admin/courses/[courseId]` — raw JSON textarea editor for that
  course's `lines` array (`CourseLinesEditor.tsx`). Save does client-side
  `JSON.parse` first, then `PUT`s to the API route.
- `GET/PUT /api/admin/courses/[courseId]` (`route.ts`) — `GET` returns the
  full course document; `PUT` accepts `{ lines: OpeningLine[] }`, validates
  via `buildOpeningTree`, and either persists or returns a 400 with the
  validation error.

## 8. Trainer session logic

`useOpeningTrainer` (`src/lib/chess/useOpeningTrainer.ts`) is the only React
hook that touches game state; it's a thin adapter over the pure functions in
`openingTrainer.ts` (tree building, move matching, opponent-reply selection,
hint/answer text, line-completion detection — none of which import React).

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

## 9. Project structure

```
src/
  app/
    page.tsx                       Home: course list
    courses/[courseId]/page.tsx    Training page
    admin/                         Minimal course-editing UI
    api/admin/courses/[courseId]/  Admin write API
  components/
    chess/                         Board, panel, move list, course card
    admin/                         CourseLinesEditor
    layout/                        SiteHeader
  lib/
    chess/
      openingTypes.ts              Data model
      fen.ts                       Position-identity normalization
      openingTrainer.ts            Pure trainer logic (tree, matching, hints)
      useOpeningTrainer.ts         React hook wiring trainer logic to the board
      openingRepository.ts         Data access layer (MongoDB-backed)
      pgnImport.ts                 PGN → OpeningMove[] helper (not wired into any UI yet)
    db/
      mongo.ts                     Cached MongoClient singleton
  data/
    courses/*.json                 Seed data, consumed only by scripts/seedCourses.mjs
scripts/
  seedCourses.mjs                  One-off upsert of seed JSON into MongoDB
```

## 10. Known simplifications (intentional, for a single-user MVP)

- Pawn promotion always defaults to queen (`attemptMove` in
  `openingTrainer.ts`) — covers the vast majority of opening-phase
  promotions without a promotion-choice UI.
- Opponent reply selection is uniform random, not weighted.
- No authentication anywhere, including `/admin`.
- No spaced-repetition/scheduling layer — "Next Line" is a random pick, not
  a due-card queue. See [docs/BUSINESS.md §5](./BUSINESS.md#5-vision-getting-to-spaced-repetition-not-just-random-drill)
  for where this is headed.
