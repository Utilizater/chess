// Minimal admin API for editing a course's prepared lines directly in
// MongoDB. Not authenticated — this is a trusted, local/future-admin-only
// tool, not a public endpoint. Add auth before exposing this beyond that.

import { NextResponse } from "next/server";
import { courseRepository } from "@/lib/chess/openingRepository";
import type { OpeningLine } from "@/lib/chess/openingTypes";

type RouteParams = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: RouteParams) {
  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);
  if (!course) {
    return NextResponse.json({ error: `Course "${courseId}" not found` }, { status: 404 });
  }
  return NextResponse.json(course);
}

export async function PUT(request: Request, { params }: RouteParams) {
  const { courseId } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  const lines = (body as { lines?: unknown })?.lines;
  if (!Array.isArray(lines)) {
    return NextResponse.json({ error: "Body must be { lines: OpeningLine[] }" }, { status: 400 });
  }

  try {
    const updated = await courseRepository.updateCourseLines(courseId, lines as OpeningLine[]);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
