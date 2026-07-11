import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

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
        <div className="flex items-center gap-3">
          <Show when="signed-out">
            <SignInButton>
              <button className="rounded-md px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-900/5 dark:text-stone-200 dark:hover:bg-stone-100/10">
                Sign in
              </button>
            </SignInButton>
            <SignUpButton>
              <button className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-700">
                Sign up
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </div>
    </header>
  );
}
