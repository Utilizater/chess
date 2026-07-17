// Minimal admin API for editing a course's prepared move tree directly in
// MongoDB. Not authenticated — this is a trusted, local/future-admin-only
// tool, not a public endpoint. Add auth before exposing this beyond that.

import { NextResponse } from "next/server";
import { courseRepository } from "@/lib/chess/openingRepository";
import type { OpeningTrieNode } from "@/lib/chess/openingTypes";

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

  const root = (body as { root?: unknown })?.root;
  if (!Array.isArray(root)) {
    return NextResponse.json(
      { error: "Body must be { root: OpeningTrieNode[] }" },
      { status: 400 },
    );
  }

  try {
    const updated = await courseRepository.updateCourseTree(courseId, root as OpeningTrieNode[]);
    return NextResponse.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update course";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
