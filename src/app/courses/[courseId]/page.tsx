import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ChessTrainerBoardLoader } from "@/components/chess/ChessTrainerBoardLoader";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { courseRepository } from "@/lib/chess/openingRepository";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  await auth.protect();

  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 sm:px-6">
        <Link
          href="/"
          className="text-sm text-stone-500 transition hover:text-amber-700 dark:text-stone-400 dark:hover:text-amber-500"
        >
          &larr; All courses
        </Link>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-stone-900 sm:text-3xl dark:text-stone-100">
          {course.title}
        </h1>
      </div>
      <ChessTrainerBoardLoader course={course} />
    </div>
  );
}
