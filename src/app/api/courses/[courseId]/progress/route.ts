// Records a single training event (correct move, mistake, hint, or line
// completion) against the signed-in user's progress for a course/line.
// Called from useOpeningTrainer as training happens; see progressClient.ts.

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { courseRepository } from "@/lib/chess/openingRepository";
import { collectLineSummaries } from "@/lib/chess/openingTrainer";
import { progressRepository } from "@/lib/chess/progressRepository";
import type { ProgressEventKind } from "@/lib/chess/progressTypes";

const VALID_KINDS: ProgressEventKind[] = ["correct", "mistake", "hint", "complete"];

type RouteParams = { params: Promise<{ courseId: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { courseId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const { lineId, kind, clean } = (body ?? {}) as {
    lineId?: unknown;
    kind?: unknown;
    clean?: unknown;
  };

  if (typeof lineId !== "string" || !lineId) {
    return NextResponse.json({ error: 'Body must include a string "lineId"' }, { status: 400 });
  }
  if (typeof kind !== "string" || !VALID_KINDS.includes(kind as ProgressEventKind)) {
    return NextResponse.json(
      { error: `"kind" must be one of ${VALID_KINDS.join(", ")}` },
      { status: 400 },
    );
  }

  await progressRepository.recordEvent(
    userId,
    courseId,
    lineId,
    kind as ProgressEventKind,
    clean === true,
  );

  // Only a completion can move a line's status, so only completions can
  // change which tier is unlocked.
  if (kind === "complete") {
    const course = await courseRepository.getCourseById(courseId);
    if (course) {
      await progressRepository.syncUnlockedTier(userId, courseId, collectLineSummaries(course.root));
    }
  }

  return NextResponse.json({ ok: true });
}
