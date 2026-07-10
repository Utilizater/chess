import { notFound } from "next/navigation";
import { ChessTrainerBoardLoader } from "@/components/chess/ChessTrainerBoardLoader";
import { courseRepository } from "@/lib/chess/openingRepository";

type CoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function CoursePage({ params }: CoursePageProps) {
  const { courseId } = await params;
  const course = await courseRepository.getCourseById(courseId);

  if (!course) {
    notFound();
  }

  return (
    <div className="flex flex-1 flex-col bg-zinc-50 dark:bg-black">
      <ChessTrainerBoardLoader course={course} />
    </div>
  );
}
