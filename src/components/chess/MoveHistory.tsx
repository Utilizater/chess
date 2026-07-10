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
      <p className="text-sm text-slate-500 dark:text-slate-400">
        No moves played yet.
      </p>
    );
  }

  return (
    <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-2 sm:max-h-56 dark:border-slate-700 dark:bg-slate-900">
      <ol className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        {pairs.map((pair) => (
          <li
            key={pair.moveNumber}
            className="flex items-baseline gap-2 font-mono text-slate-700 dark:text-slate-300"
          >
            <span className="w-6 shrink-0 text-slate-400 dark:text-slate-500">
              {pair.moveNumber}.
            </span>
            <span className="min-w-[3.5rem]">{pair.white}</span>
            <span>{pair.black ?? ""}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
