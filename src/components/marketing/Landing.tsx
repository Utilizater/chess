import { SignInButton, SignUpButton } from "@clerk/nextjs";

const FEATURES = [
  {
    icon: "♟",
    title: "Move-by-move drills",
    description:
      "Every line is broken into single moves, so you build real board recognition instead of memorizing a wall of notation.",
  },
  {
    icon: "♞",
    title: "Built for repetition",
    description:
      "Miss a move and the trainer loops you back, the same way spaced repetition works for flashcards — but for openings.",
  },
  {
    icon: "♜",
    title: "Study either side",
    description:
      "Courses are labeled by the color you're training, so you can drill your White repertoire or your Black defenses.",
  },
];

export function Landing() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center px-4 py-16 text-center sm:px-6 sm:py-24">
      <span aria-hidden className="text-5xl text-amber-700 dark:text-amber-500">
        ♞
      </span>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
        Master chess openings, one move at a time.
      </h1>
      <p className="mt-4 max-w-xl text-lg text-stone-600 dark:text-stone-400">
        Chess Opening Trainer turns opening theory into short, focused drills
        so it actually sticks at the board — not just in a database.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <SignUpButton>
          <button className="rounded-md bg-amber-700 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700">
            Create a free account
          </button>
        </SignUpButton>
        <SignInButton>
          <button className="rounded-md border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-900/5 dark:border-stone-700 dark:text-stone-200 dark:hover:bg-stone-100/10">
            Sign in
          </button>
        </SignInButton>
      </div>

      <div className="mt-16 grid w-full gap-4 text-left sm:grid-cols-3">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="rounded-xl border border-stone-200 bg-white p-5 shadow-sm dark:border-stone-700 dark:bg-stone-900"
          >
            <span
              aria-hidden
              className="flex size-10 items-center justify-center rounded-lg bg-amber-50 text-xl text-amber-700 dark:bg-amber-950/60 dark:text-amber-500"
            >
              {feature.icon}
            </span>
            <h2 className="mt-3 font-serif text-base font-semibold text-stone-900 dark:text-stone-100">
              {feature.title}
            </h2>
            <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
