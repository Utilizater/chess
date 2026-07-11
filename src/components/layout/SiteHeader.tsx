import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-amber-900/10 bg-[#faf6f0]/90 backdrop-blur-sm dark:border-amber-100/10 dark:bg-[#211b15]/90">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-serif text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100"
        >
          <span aria-hidden className="text-xl text-amber-700 dark:text-amber-500">
            ♞
          </span>
          Chess Opening Trainer
        </Link>
      </div>
    </header>
  );
}
