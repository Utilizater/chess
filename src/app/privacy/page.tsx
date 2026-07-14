import type { Metadata } from "next";
import { SiteHeader } from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "Privacy Policy — Chess Opening Trainer",
  description: "How Chess Lines handles your data.",
};

export default function PrivacyPage() {
  return (
    <div className="flex flex-1 flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
          Privacy Policy
        </h1>

        <div className="mt-8 space-y-4 text-lg text-stone-700 dark:text-stone-300">
          <p>Chess Lines respects your privacy.</p>
          <p>We collect authentication information via Clerk.</p>
          <p>We do not sell personal data.</p>
          <p>
            Contact:{" "}
            <a
              href="mailto:nickpolevoi@gmail.com"
              className="text-amber-700 underline hover:text-amber-800 dark:text-amber-500 dark:hover:text-amber-400"
            >
              nickpolevoi@gmail.com
            </a>
          </p>
        </div>
      </main>
    </div>
  );
}
