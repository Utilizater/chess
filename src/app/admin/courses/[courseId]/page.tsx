import { notFound } from "next/navigation";
import Link from "next/link";
import { CourseLinesEditor } from "@/components/admin/CourseLinesEditor";
import { SiteHeader } from "@/components/layout/SiteHeader";
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
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <Link
          href="/admin"
          className="text-sm text-stone-500 hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500"
        >
          &larr; All courses
        </Link>
        <h1 className="mt-2 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
          {course.title}
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Edit the raw <code>lines</code> array for this course and save. Invalid or illegal moves
          are rejected before anything is written.
        </p>
        <div className="mt-4">
          <CourseLinesEditor courseId={course.id} initialLines={course.lines} />
        </div>
      </div>
    </div>
  );
}
