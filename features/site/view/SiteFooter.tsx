import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:px-6">
        <p>
          <span className="font-bold text-fg">E·Ticket</span> · Book live events in seconds.
        </p>
        <nav aria-label="Footer" className="flex gap-4">
          <Link href="/events" className="hover:text-fg">
            Events
          </Link>
          <Link href="/tickets" className="hover:text-fg">
            My Tickets
          </Link>
          <Link href="/profile" className="hover:text-fg">
            Profile
          </Link>
        </nav>
      </div>
    </footer>
  );
}
