"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import type { OrganizerStatus, UserRole } from "@/lib/database.types";
import { cn } from "@/lib/cn";
import { useDismiss } from "@/lib/useDismiss";
import { ButtonLink } from "@/components/ui/Button";
import { NotificationBell } from "@/features/notifications/view/NotificationBell";

export type HeaderViewer = {
  name: string;
  avatarUrl: string | null;
  role: UserRole;
  organizerStatus: OrganizerStatus | null;
  isStaff: boolean;
} | null;

// "Mode" links: switch between booking, hosting and admin.
function modeLinks(viewer: NonNullable<HeaderViewer>) {
  const links: { href: string; label: string }[] = [];
  if (viewer.organizerStatus === "approved") {
    links.push({ href: "/manager", label: "Event Manager dashboard" });
  } else if (viewer.organizerStatus) {
    links.push({ href: "/manager/application", label: "Organizer application" });
  } else if (viewer.role !== "admin") {
    links.push({ href: "/manager/application", label: "Host events" });
  }
  if (viewer.isStaff && viewer.organizerStatus !== "approved") {
    links.push({ href: "/manager/check-in", label: "Check-in" });
  }
  return links;
}

const NAV = [
  { href: "/events", label: "Events" },
  { href: "/tickets", label: "My Tickets" },
];

function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    return (
      <Image src={url} alt="" width={size} height={size} unoptimized className="rounded-full object-cover" style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden
      className="grid place-items-center rounded-full bg-accent font-bold text-on-accent"
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0).toUpperCase() || "?"}
    </span>
  );
}

function AccountMenu({ viewer }: { viewer: NonNullable<HeaderViewer> }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, containerRef, triggerRef);

  const itemClass = "block rounded-md px-3 py-2 text-sm font-medium hover:bg-surface-2";

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-controls="account-menu"
        aria-label={`Account menu for ${viewer.name}`}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full ring-offset-2 ring-offset-bg hover:ring-2 hover:ring-border"
      >
        <Avatar name={viewer.name} url={viewer.avatarUrl} />
      </button>
      {open ? (
        <div
          id="account-menu"
          className="absolute right-0 z-40 mt-2 w-56 rounded-lg border border-border bg-surface p-1.5 shadow-2xl"
        >
          <p className="truncate px-3 py-2 text-xs text-muted">Signed in as {viewer.name}</p>
          <Link href="/profile" className={itemClass} onClick={close}>
            Profile
          </Link>
          <Link href="/tickets" className={itemClass} onClick={close}>
            My Tickets
          </Link>
          {modeLinks(viewer).map((link) => (
            <Link key={link.href} href={link.href} className={itemClass} onClick={close}>
              {link.label}
            </Link>
          ))}
          <hr className="my-1 border-border" />
          <Link href="/logout" className={itemClass} onClick={close}>
            Log out
          </Link>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({ viewer }: { viewer: HeaderViewer }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-bg/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="text-lg font-extrabold tracking-tight">
          E<span className="text-accent">·</span>Ticket
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-2 text-sm font-semibold",
                  active ? "text-fg" : "text-muted hover:text-fg"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {viewer ? (
            <>
              <NotificationBell />
              <AccountMenu viewer={viewer} />
            </>
          ) : (
            <>
              <ButtonLink href={`/login?next=${encodeURIComponent(pathname)}`} variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink href="/signup" size="sm" className="hidden sm:inline-flex">
                Sign up
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
