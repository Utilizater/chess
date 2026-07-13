// Client-side helper for reporting training events to the progress API.
// Fire-and-forget: a dropped event shouldn't disrupt the training session,
// so failures are swallowed rather than surfaced in the UI.

import type { ProgressEventKind } from "./progressTypes";

/**
 * Returns a promise so callers that need to know when the write has landed
 * (e.g. to refresh server-rendered progress UI after a line completes) can
 * await it — most callers still fire-and-forget by simply not awaiting.
 */
export function recordProgressEvent(
  courseId: string,
  lineId: string,
  kind: ProgressEventKind,
  clean?: boolean,
): Promise<void> {
  return fetch(`/api/courses/${courseId}/progress`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ lineId, kind, clean }),
    // Lets the request complete even if the user navigates away right
    // after finishing a line (e.g. clicking back to the course list).
    keepalive: true,
  })
    .then(() => undefined)
    .catch(() => {});
}
