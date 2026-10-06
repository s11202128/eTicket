export type IconName =
  | "dashboard"
  | "ticket"
  | "event"
  | "profile"
  | "logout"
  | "calendar"
  | "clock"
  | "check";

export type NavId =
  | "dashboard"
  | "tickets"
  | "events"
  | "profile"
  | "admin"
  | "logout";

export type SidebarItem = {
  id: NavId;
  label: string;
  href: string;
  icon: IconName;
};

export const ICONS: Record<IconName, string> = {
  dashboard: "▦",
  ticket: "🎫",
  event: "🎵",
  profile: "👤",
  logout: "↪",
  calendar: "📅",
  clock: "⏱",
  check: "✔",
};

export const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard" },
  { id: "tickets", label: "My Tickets", href: "/tickets", icon: "ticket" },
  { id: "events", label: "Events", href: "/events", icon: "event" },
  { id: "profile", label: "Profile", href: "/profile", icon: "profile" },
  { id: "logout", label: "Logout", href: "/logout", icon: "logout" },
];

// Shown to staff and admins only.
export const ADMIN_ITEM: SidebarItem = { id: "admin", label: "Admin", href: "/admin", icon: "dashboard" };
