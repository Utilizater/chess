import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { CourseTreeEditor } from "@/components/admin/CourseTreeEditor";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { courseRepository } from "@/lib/chess/openingRepository";
import { isCurrentUserAdmin } from "@/lib/auth/isAdmin";

type AdminCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function AdminCoursePage({ params }: AdminCoursePageProps) {
  if (!(await isCurrentUserAdmin())) {
    redirect("/");
  }

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
          Edit the raw move tree (<code>root</code>) for this course and save. Invalid or illegal
          moves are rejected before anything is written.
        </p>
        <div className="mt-4">
          <CourseTreeEditor courseId={course.id} initialRoot={course.root} />
        </div>
      </div>
    </div>
  );
}
