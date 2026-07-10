import Link from "next/link";
import { courseRepository } from "@/lib/chess/openingRepository";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const courses = await courseRepository.listCourses();

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
        Admin: Courses
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Select a course to edit its prepared lines.
      </p>
      <ul className="mt-4 flex flex-col gap-2">
        {courses.map((course) => (
          <li key={course.id}>
            <Link
              href={`/admin/courses/${course.id}`}
              className="block rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-600"
            >
              {course.title}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
