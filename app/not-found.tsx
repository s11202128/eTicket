import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

export const metadata: Metadata = { title: "Page not found" };

// Unknown URLs render outside the public layout, so this page brings its own theme.
export default function NotFound() {
  return (
    <main className="theme-public grid min-h-screen place-items-center bg-bg px-4 text-fg">
      <div className="grid justify-items-center gap-4 text-center">
        <p className="text-6xl font-extrabold text-accent">404</p>
        <h1 className="text-2xl font-extrabold">This page doesn&apos;t exist</h1>
        <p className="max-w-md text-muted">The link may be broken or the page may have moved.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Link href="/" className={buttonClasses("primary")}>
            Go to homepage
          </Link>
          <Link href="/events" className={buttonClasses("secondary")}>
            Browse events
          </Link>
        </div>
      </div>
    </main>
  );
}
