import type {
  DashboardSnapshot,
  RecentTicket,
  SidebarItem,
  UpcomingEvent,
} from "./dashboard.types";
import { listUpcomingEvents } from "@/features/events/model/events.repository";
import { listMyTickets } from "@/features/tickets/model/tickets.repository";
import type { TicketWithEvent } from "@/features/tickets/model/tickets.types";

const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80";

const SIDEBAR_ITEMS: SidebarItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: "dashboard", active: true },
  { id: "tickets", label: "My Tickets", href: "#", icon: "ticket" },
  { id: "events", label: "Events", href: "#", icon: "event" },
  { id: "create-event", label: "Create Event", href: "/events/new", icon: "calendar" },
  { id: "profile", label: "Profile", href: "#", icon: "profile" },
  { id: "logout", label: "Logout", href: "/login", icon: "logout" },
];

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const priceFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
});

function formatPrice(price: number): string {
  return price === 0 ? "Free" : priceFormatter.format(price);
}

function isTicketExpired(ticket: TicketWithEvent, now: Date): boolean {
  if (ticket.status !== "active") return true;
  return ticket.events ? new Date(ticket.events.starts_at) < now : false;
}

function toRecentTicket(ticket: TicketWithEvent, now: Date): RecentTicket {
  return {
    id: ticket.id,
    eventTitle: ticket.events?.title ?? "Event removed",
    date: ticket.events ? dateFormatter.format(new Date(ticket.events.starts_at)) : "",
    location: ticket.events?.location ?? "",
    status: isTicketExpired(ticket, now) ? "Used" : "Active",
    qrImageUrl: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
      `ETICKET-${ticket.code}`
    )}`,
  };
}

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [events, tickets] = await Promise.all([listUpcomingEvents(), listMyTickets()]);
  const now = new Date();

  const activeTickets = tickets.filter((ticket) => !isTicketExpired(ticket, now));
  const expiredTickets = tickets.length - activeTickets.length;

  const upcomingEvents: UpcomingEvent[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    date: dateFormatter.format(new Date(event.starts_at)),
    price: formatPrice(event.price),
    imageUrl: event.image_url || FALLBACK_EVENT_IMAGE,
  }));

  const [firstEvent] = events;

  return {
    appName: "E-Ticket",
    userName: "",
    userAvatar: "",
    notifications: 0,
    sidebarItems: SIDEBAR_ITEMS,
    stats: [
      {
        id: "active-tickets",
        title: "Active Tickets",
        value: activeTickets.length,
        subtitle: "Ready to use",
        icon: "ticket",
      },
      {
        id: "upcoming-events",
        title: "Upcoming Events",
        value: events.length,
        subtitle: "Scheduled events",
        icon: "calendar",
      },
      {
        id: "expired-tickets",
        title: "Expired Tickets",
        value: expiredTickets,
        subtitle: "From previous events",
        icon: "clock",
      },
    ],
    nextEvent: firstEvent
      ? {
          title: firstEvent.title,
          dateTime: dateTimeFormatter.format(new Date(firstEvent.starts_at)),
          location: firstEvent.location,
          imageUrl: firstEvent.image_url || FALLBACK_EVENT_IMAGE,
          ctaLabel: "View Details",
        }
      : null,
    recentTickets: tickets.slice(0, 4).map((ticket) => toRecentTicket(ticket, now)),
    upcomingEvents,
    updatedAt: now.toISOString(),
  };
}
