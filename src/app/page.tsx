import { CourseCard } from "@/components/chess/CourseCard";
import { courseRepository } from "@/lib/chess/openingRepository";

// Course data now lives in MongoDB, not compile-time JSON, so this page
// must not be statically frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const courses = await courseRepository.listCourses();

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">
          Chess Opening Trainer
        </h1>
        <p className="mt-2 text-lg text-slate-600 dark:text-slate-400">
          Train openings as move-by-move memory drills.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      </main>
    </div>
  );
}
