import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Delete Account — Chess Opening Trainer",
  description: "How to request account deletion for Chess Lines.",
};

export default function DeleteAccountPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          Delete Account
        </h1>

        <div className="mt-8 space-y-4 text-lg text-stone-700 dark:text-stone-300">
          <p>
            Send an email to{" "}
            <a
              href="mailto:nickpolevoi@gmail.com"
              className="text-amber-700 underline hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
            >
              nickpolevoi@gmail.com
            </a>{" "}
            to request account deletion.
          </p>
        </div>
      </main>
    </div>
  );
}
