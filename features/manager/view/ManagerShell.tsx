"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { NotificationBell } from "@/features/notifications/view/NotificationBell";

type NavItem = { href: string; label: string; icon: string; organizerOnly?: boolean };

const NAV: NavItem[] = [
  { href: "/manager", label: "Overview", icon: "▦", organizerOnly: true },
  { href: "/manager/events", label: "My Events", icon: "🎟", organizerOnly: true },
  { href: "/manager/events/new", label: "Create Event", icon: "＋", organizerOnly: true },
  { href: "/manager/check-in", label: "Check-in", icon: "✔" },
  { href: "/manager/team", label: "Team", icon: "👥", organizerOnly: true },
  { href: "/manager/notifications", label: "Notifications", icon: "🔔" },
  { href: "/manager/organization", label: "Organization profile", icon: "🏢", organizerOnly: true },
];

export type ManagerShellProps = {
  organizationName: string;
  logoUrl: string | null;
  // Door staff and admins only get Check-in and Notifications.
  isOrganizer: boolean;
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  if (href === "/manager") return pathname === "/manager";
  if (href === "/manager/events") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith("/manager/events/new"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function OrgBadge({ name, logoUrl, size = 36 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-md object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid shrink-0 place-items-center rounded-md bg-accent font-bold text-on-accent"
      style={{ width: size, height: size }}
    >
      {name.trim().charAt(0).toUpperCase() || "E"}
    </span>
  );
}

export function ManagerShell({ organizationName, logoUrl, isOrganizer, children }: ManagerShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((item) => isOrganizer || !item.organizerOnly);

  const linkClass = (active: boolean) =>
    cn(
      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
      active ? "bg-accent text-on-accent" : "text-muted hover:bg-surface-2 hover:text-fg"
    );

  const nav = (
    <nav aria-label="Event Manager" className="grid gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={linkClass(active)}
          >
            <span aria-hidden className="w-5 text-center">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
      <hr className="my-2 border-border" />
      <Link href="/" className={linkClass(false)}>
        <span aria-hidden className="w-5 text-center">
          ↗
        </span>
        View public site
      </Link>
      <Link href="/tickets" className={linkClass(false)}>
        <span aria-hidden className="w-5 text-center">
          🎫
        </span>
        My tickets
      </Link>
      <Link href="/logout" className={linkClass(false)}>
        <span aria-hidden className="w-5 text-center">
          ↪
        </span>
        Log out
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[256px_1fr]">
      <a
        href="#manager-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      {/* Dark ink sidebar (desktop) */}
      <aside className="theme-public sticky top-0 hidden h-screen flex-col gap-6 overflow-y-auto bg-bg p-4 text-fg lg:flex">
        <Link href={isOrganizer ? "/manager" : "/manager/check-in"} className="px-1 text-lg font-extrabold tracking-tight">
          E<span className="text-accent">·</span>Ticket <span className="text-accent-text">Manager</span>
        </Link>
        {nav}
      </aside>

      <div className="min-w-0">
        {/* Top bar: organization + notifications; menu button on small screens */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-3">
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="manager-mobile-nav"
            className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold lg:hidden"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <OrgBadge name={organizationName} logoUrl={logoUrl} />
            <p className="truncate font-bold">{organizationName}</p>
          </div>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        {menuOpen ? (
          <div id="manager-mobile-nav" className="theme-public border-b border-border bg-bg p-3 text-fg lg:hidden">
            {nav}
          </div>
        ) : null}

        <main id="manager-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-6xl gap-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
