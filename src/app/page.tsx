import { auth } from "@clerk/nextjs/server";
import { CourseCard } from "@/components/chess/CourseCard";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Landing } from "@/components/marketing/Landing";
import { courseRepository } from "@/lib/chess/openingRepository";
import { computeCourseProgressSummary } from "@/lib/chess/progress";
import { progressRepository } from "@/lib/chess/progressRepository";

// Course data now lives in MongoDB, not compile-time JSON, so this page
// must not be statically frozen at build time.
export const dynamic = "force-dynamic";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="flex flex-1 flex-col">
        <SiteHeader />
        <Landing />
      </div>
    );
  }

  const [courses, progressByCourse] = await Promise.all([
    courseRepository.listCourses(),
    progressRepository.listForUser(userId),
  ]);

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          Chess Opening Trainer
        </h1>
        <p className="mt-3 text-lg text-stone-600 dark:text-stone-400">
          Train openings as move-by-move memory drills.
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {courses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              progress={computeCourseProgressSummary(
                course.lineIds,
                progressByCourse.get(course.id),
              )}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
