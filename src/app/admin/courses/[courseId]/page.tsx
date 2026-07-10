import { notFound } from "next/navigation";
import Link from "next/link";
import { CourseLinesEditor } from "@/components/admin/CourseLinesEditor";
import { courseRepository } from "@/lib/chess/openingRepository";

type AdminCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function AdminCoursePage({ params }: AdminCoursePageProps) {
  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <Link href="/admin" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
        &larr; All courses
      </Link>
      <h1 className="mt-2 text-xl font-semibold text-slate-900 dark:text-slate-100">
        {course.title}
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Edit the raw <code>lines</code> array for this course and save. Invalid or illegal moves
        are rejected before anything is written.
      </p>
      <div className="mt-4">
        <CourseLinesEditor courseId={course.id} initialLines={course.lines} />
      </div>
    </div>
  );
}
