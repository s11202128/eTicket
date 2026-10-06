"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { UserRole } from "@/lib/database.types";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: string; roles: UserRole[] };

const NAV: NavItem[] = [
  { href: "/admin", label: "Overview", icon: "▦", roles: ["admin"] },
  { href: "/admin/events", label: "Events", icon: "🎟", roles: ["admin"] },
  { href: "/admin/bookings", label: "Bookings", icon: "🧾", roles: ["admin"] },
  { href: "/admin/check-in", label: "Check-in", icon: "✔", roles: ["admin", "staff"] },
  { href: "/admin/users", label: "Users", icon: "👥", roles: ["admin"] },
  { href: "/admin/content", label: "Content", icon: "✎", roles: ["admin"] },
  { href: "/admin/categories", label: "Categories", icon: "🏷", roles: ["admin"] },
  { href: "/admin/notifications", label: "Notifications", icon: "🔔", roles: ["admin"] },
];

type AdminShellProps = {
  role: UserRole;
  name: string;
  children: ReactNode;
};

function isActive(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminShell({ role, name, children }: AdminShellProps) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const items = NAV.filter((item) => item.roles.includes(role));

  const nav = (
    <nav aria-label="Admin" className="grid gap-1">
      {items.map((item) => {
        const active = isActive(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={() => setMenuOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-fg text-surface" : "text-muted hover:bg-surface-2 hover:text-fg"
            )}
          >
            <span aria-hidden className="w-5 text-center">
              {item.icon}
            </span>
            {item.label}
          </Link>
        );
      })}
      <hr className="my-2 border-border" />
      <Link
        href="/"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
      >
        <span aria-hidden className="w-5 text-center">
          ↗
        </span>
        View site
      </Link>
      <Link
        href="/logout"
        className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted hover:bg-surface-2 hover:text-fg"
      >
        <span aria-hidden className="w-5 text-center">
          ↪
        </span>
        Log out
      </Link>
    </nav>
  );

  return (
    <div className="min-h-screen bg-bg text-fg lg:grid lg:grid-cols-[240px_1fr]">
      <a
        href="#admin-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-border bg-surface px-4 py-3 lg:hidden">
        <span className="font-bold">E-Ticket Admin</span>
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="admin-mobile-nav"
          className="rounded-md border border-border px-3 py-1.5 text-sm font-semibold"
        >
          {menuOpen ? "Close" : "Menu"}
        </button>
      </header>
      {menuOpen ? (
        <div id="admin-mobile-nav" className="border-b border-border bg-surface p-3 lg:hidden">
          {nav}
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col gap-6 border-r border-border bg-surface p-4 lg:flex">
        <div>
          <p className="text-lg font-extrabold">
            E-Ticket <span className="text-accent-text">Admin</span>
          </p>
          <p className="mt-1 truncate text-xs text-muted">
            {name} · <span className="capitalize">{role}</span>
          </p>
        </div>
        {nav}
      </aside>

      <main id="admin-main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-6">{children}</div>
      </main>
    </div>
  );
}
