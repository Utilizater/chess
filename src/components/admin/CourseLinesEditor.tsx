"use client";

import { useState } from "react";
import type { OpeningLine } from "@/lib/chess/openingTypes";

export function CourseLinesEditor({
  courseId,
  initialLines,
}: {
  courseId: string;
  initialLines: OpeningLine[];
}) {
  const [text, setText] = useState(() => JSON.stringify(initialLines, null, 2));
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [message, setMessage] = useState<string | undefined>();

  async function handleSave() {
    let parsedLines: unknown;
    try {
      parsedLines = JSON.parse(text);
    } catch {
      setStatus("error");
      setMessage("Not valid JSON.");
      return;
    }

    setStatus("saving");
    setMessage(undefined);
    try {
      const response = await fetch(`/api/admin/courses/${courseId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: parsedLines }),
      });
      const data = await response.json();
      if (!response.ok) {
        setStatus("error");
        setMessage(data.error ?? "Save failed.");
        return;
      }
      setStatus("saved");
      setMessage("Saved.");
    } catch {
      setStatus("error");
      setMessage("Network error while saving.");
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="h-[60vh] w-full rounded-lg border border-stone-300 bg-white p-3 font-mono text-sm text-stone-800 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleSave}
          disabled={status === "saving"}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
        >
          {status === "saving" ? "Saving..." : "Save"}
        </button>
        {message && (
          <span
            className={
              status === "error"
                ? "text-sm text-red-600 dark:text-red-400"
                : "text-sm text-green-600 dark:text-green-400"
            }
          >
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
