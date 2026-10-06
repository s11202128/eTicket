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
  | "create-event"
  | "check-in"
  | "profile"
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
  { id: "create-event", label: "Create Event", href: "/events/new", icon: "calendar" },
  { id: "check-in", label: "Check-in", href: "/check-in", icon: "check" },
  { id: "profile", label: "Profile", href: "/profile", icon: "profile" },
  { id: "logout", label: "Logout", href: "/logout", icon: "logout" },
];
