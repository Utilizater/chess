"use client";

import { useMemo, useState } from "react";
import type { Tier } from "@/lib/chess/openingTypes";
import type { LineStatus } from "@/lib/chess/progress";
import { StatusBadge } from "./StatusBadge";
import { TierBadge, TIER_STYLES } from "./TierBadge";

export type LineProgressRow = {
  id: string;
  name: string;
  description?: string;
  tier: Tier;
  /** Not yet reachable in training because its stage isn't unlocked. */
  locked: boolean;
  status: LineStatus;
  correctMoves: number;
  mistakes: number;
  hintsUsed: number;
  completions: number;
  cleanStreak: number;
  lastAttemptAt?: Date;
};

type SortColumn =
  | "name"
  | "tier"
  | "status"
  | "correctMoves"
  | "mistakes"
  | "hintsUsed"
  | "completions"
  | "cleanStreak"
  | "lastAttemptAt";

type SortDirection = "asc" | "desc";

type ColumnDef = {
  key: SortColumn;
  label: string;
  align: "left" | "right";
  /** Direction applied the first time this column is clicked. */
  defaultDirection: SortDirection;
};

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Line", align: "left", defaultDirection: "asc" },
  { key: "tier", label: "Stage", align: "left", defaultDirection: "asc" },
  { key: "status", label: "Status", align: "left", defaultDirection: "asc" },
  { key: "correctMoves", label: "Correct", align: "right", defaultDirection: "desc" },
  { key: "mistakes", label: "Mistakes", align: "right", defaultDirection: "desc" },
  { key: "hintsUsed", label: "Hints", align: "right", defaultDirection: "desc" },
  { key: "completions", label: "Completions", align: "right", defaultDirection: "desc" },
  { key: "cleanStreak", label: "Clean streak", align: "right", defaultDirection: "desc" },
  { key: "lastAttemptAt", label: "Last attempt", align: "left", defaultDirection: "desc" },
];

// Alphabetical order doesn't reflect progression order, so status sorts by
// this rank instead of the raw string.
const STATUS_RANK: Record<LineStatus, number> = {
  "not-started": 0,
  learning: 1,
  mastered: 2,
};

function compareRows(a: LineProgressRow, b: LineProgressRow, column: SortColumn): number {
  switch (column) {
    case "name":
      return a.name.localeCompare(b.name);
    case "tier":
      return a.tier - b.tier;
    case "status":
      return STATUS_RANK[a.status] - STATUS_RANK[b.status];
    case "lastAttemptAt":
      // Lines never attempted sort as if they happened at time zero.
      return (a.lastAttemptAt?.getTime() ?? 0) - (b.lastAttemptAt?.getTime() ?? 0);
    case "correctMoves":
    case "mistakes":
    case "hintsUsed":
    case "completions":
    case "cleanStreak":
      return a[column] - b[column];
  }
}

function formatLastAttempt(date?: Date): string {
  if (!date) return "—";
  return date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function LineProgressTable({ rows }: { rows: LineProgressRow[] }) {
  const [sortColumn, setSortColumn] = useState<SortColumn>("lastAttemptAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const sortedRows = useMemo(() => {
    const sorted = [...rows].sort((a, b) => compareRows(a, b, sortColumn));
    return sortDirection === "asc" ? sorted : sorted.reverse();
  }, [rows, sortColumn, sortDirection]);

  const handleSort = (column: ColumnDef) => {
    if (column.key === sortColumn) {
      setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column.key);
      setSortDirection(column.defaultDirection);
    }
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-stone-200 dark:border-stone-700">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-stone-200 bg-stone-50 text-left text-xs font-medium uppercase tracking-wide text-stone-500 dark:border-stone-700 dark:bg-stone-800/60 dark:text-stone-400">
            {COLUMNS.map((column) => {
              const isActive = sortColumn === column.key;
              return (
                <th
                  key={column.key}
                  aria-sort={isActive ? (sortDirection === "asc" ? "ascending" : "descending") : "none"}
                  className={`px-4 py-3 ${column.align === "right" ? "text-right" : "text-left"}`}
                >
                  <button
                    type="button"
                    onClick={() => handleSort(column)}
                    className={`inline-flex items-center gap-1 whitespace-nowrap transition hover:text-stone-800 dark:hover:text-stone-200 ${
                      column.align === "right" ? "flex-row-reverse" : ""
                    } ${isActive ? "text-stone-800 dark:text-stone-200" : ""}`}
                  >
                    {column.label}
                    <span aria-hidden className="text-[10px] text-stone-400 dark:text-stone-500">
                      {isActive ? (sortDirection === "asc" ? "▲" : "▼") : ""}
                    </span>
                  </button>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr
              key={row.id}
              className={`border-b border-l-4 border-stone-100 last:border-b-0 dark:border-stone-800 ${
                TIER_STYLES[row.tier].border
              } ${row.locked ? "opacity-50" : ""}`}
            >
              <td className="px-4 py-3">
                <div className="font-medium text-stone-900 dark:text-stone-100">{row.name}</div>
                {row.description && (
                  <div className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">
                    {row.description}
                  </div>
                )}
              </td>
              <td className="px-4 py-3">
                <TierBadge tier={row.tier} locked={row.locked} />
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                {row.correctMoves}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                {row.mistakes}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                {row.hintsUsed}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                {row.completions}
              </td>
              <td className="px-4 py-3 text-right tabular-nums text-stone-700 dark:text-stone-300">
                {row.cleanStreak}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-stone-500 dark:text-stone-400">
                {formatLastAttempt(row.lastAttemptAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
