# Chess Opening Trainer — a Free Spaced Repetition Scheduler for Chess Openings

## 1. The problem

Opening preparation is usually stored as walls of PGN, video timestamps, or
loose notes — none of which test whether you can actually *produce* the
moves under a boardstate, the way spaced-repetition tools do for vocabulary
or facts. Existing chess-opening trainers are either bundled into paid
subscriptions on large platforms, or are engine-analysis tools that grade
move *quality* rather than drilling *memorized prep*.

This project is a free, self-hosted alternative aimed squarely at one job:
turn a set of prepared opening lines into an Anki-style drill, where the
board is the prompt, the correct move is the answer, and wrong answers get
immediate, specific feedback instead of silently reinforcing a bad habit.

## 2. Who it's for

A single user (or small group) studying their own opening repertoire, who
wants to:

- Enter a course, get a board, and start drilling immediately — no setup.
- Play the "book" side of an opening while the app plays all the prepared
  replies for the other side, chosen randomly among the branches on file.
- Get told plainly when a move isn't in the prepared tree, with the option
  to reveal the correct move rather than guess-and-check.
- Restart a specific line or jump to a different one on demand, to drill
  breadth as well as depth.

It is explicitly **not** an engine trainer — there is no Stockfish, no
position evaluation, and no move generation beyond legality checking. Every
"correct" move in the app is one a human curated ahead of time. If it's not
in the data, the app has no opinion on whether it's actually good.

## 3. Core user flow

1. Open the app → see a list of courses (currently one: Blackmar-Diemer
   Gambit).
2. Pick a course → land in training mode with a board and a side panel.
3. Play the side you're training (White, for the BDG course). Each move is
   checked against the prepared tree for the current position:
   - **In the tree** → accepted, board advances, opponent replies
     automatically (random choice if more than one reply is prepared).
   - **Not in the tree** → rejected, board stays put, panel shows "Not this
     line." (Hint / Show Answer are available on request.)
4. Reaching a position with nothing further prepared shows "Line complete."
5. **Restart Line** replays the same line from move one. **Next Line** jumps
   to a different randomly-chosen line within the same course.

## 4. Current content

The seed course (Blackmar-Diemer Gambit) has **42 lines** covering the main
accepted lines (Bogoljubov, Teichmann, Euwe, Gunderam, Ziegler, Pietrowsky
defenses), the Ryder Gambit, several declined setups, and a handful of
3rd/4th-move sidelines and countergambits. The data model supports any
number of additional courses with no code changes — see
[docs/TECHNICAL.md](./TECHNICAL.md#adding-a-new-course).

## 5. Vision: getting to "spaced repetition," not just "random drill"

Today, line selection is still uniform random per session — there's no
notion of a line being "due," and past performance is tracked but doesn't
yet feed back into scheduling. That's the gap between what exists now (a
solid drilling MVP with basic progress tracking) and the "Free Spaced
Repetition Scheduler" this is meant to become. Planned steps, roughly in
order of value:

1. **Per-line performance tracking** — record correct/incorrect attempts per
   line, per user, so the app has something to schedule against. **Done**:
   every course card on the home page now shows a per-course status ("Not
   started" / "Learning" / "Mastered") and a mastered-lines progress bar,
   backed by a `user_course_progress` record per user/course tracking
   correct moves, mistakes, hints used, and completions per line. See
   [docs/TECHNICAL.md §6](./TECHNICAL.md#6-learner-progress). What's still
   missing: the tracked data doesn't drive anything yet (below) and mastery
   is a flat streak rule, not a graded score.
2. **Actual spaced-repetition scheduling** (e.g. an SM-2-style interval
   algorithm) driving which line "Next Line" actually picks, instead of
   uniform random.
3. **Weighted opponent replies** — surface the trickier/less-practiced
   branches more often instead of every prepared reply being equally
   likely.
4. **Multi-user support** — the above only makes sense per learner. **Done**:
   Clerk auth now gates the app and progress is tracked per `userId`, so
   each signed-in learner gets their own course/line progress.
5. **More courses**, contributed as pure data (JSON), requiring no code
   changes.
6. **Auth in front of the admin editor**, if this ever moves off a trusted
   local/single-user setup. Still open — `/admin` remains unauthenticated
   even though the rest of the app is behind Clerk now.

Items 1 and 4 above are partially built (tracking exists; scheduling off of
it doesn't yet). This section exists so the current
"random drill" MVP is understood as a step toward the scheduler, not the
end state.
