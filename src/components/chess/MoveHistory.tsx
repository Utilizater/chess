type MovePair = {
  moveNumber: number;
  white?: string;
  black?: string;
};

function toMovePairs(moves: string[]): MovePair[] {
  const pairs: MovePair[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: i / 2 + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }
  return pairs;
}

export function MoveHistory({ moves }: { moves: string[] }) {
  const pairs = toMovePairs(moves);

  if (pairs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-stone-200 p-3 text-sm text-stone-400 dark:border-stone-700 dark:text-stone-500">
        No moves played yet.
      </p>
    );
  }

  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-stone-200 sm:max-h-56 dark:border-stone-700">
      <ol className="divide-y divide-stone-100 text-sm dark:divide-stone-800">
        {pairs.map((pair) => (
          <li
            key={pair.moveNumber}
            className="flex items-baseline gap-3 px-3 py-1.5 odd:bg-stone-50 dark:odd:bg-stone-800/50"
          >
            <span className="w-5 shrink-0 text-right text-xs text-stone-400 dark:text-stone-500">
              {pair.moveNumber}
            </span>
            <span className="min-w-[3.5rem] font-mono text-stone-800 dark:text-stone-200">
              {pair.white}
            </span>
            <span className="font-mono text-stone-800 dark:text-stone-200">
              {pair.black ?? ""}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
