import Link from "next/link";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { courseRepository } from "@/lib/chess/openingRepository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const courses = await courseRepository.listCourses();

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        <h1 className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100">
          Admin: Courses
        </h1>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          Select a course to edit its prepared lines.
        </p>
        <ul className="mt-4 flex flex-col gap-2">
          {courses.map((course) => (
            <li key={course.id}>
              <Link
                href={`/admin/courses/${course.id}`}
                className="block rounded-lg border border-stone-200 bg-white px-4 py-3 text-sm font-medium text-stone-800 hover:border-amber-300 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-amber-700"
              >
                {course.title}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
