import type { DashboardSnapshot } from "./dashboard.types";
import { listUpcomingEvents } from "@/features/events/model/events.repository";
import { listMyTickets, toTicketSummary } from "@/features/tickets/model/tickets.repository";

const DASHBOARD_EVENT_LIMIT = 6;
const DASHBOARD_TICKET_LIMIT = 4;

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  const [events, ticketRows] = await Promise.all([
    listUpcomingEvents(),
    listMyTickets(),
  ]);
  const now = new Date();
  const tickets = ticketRows.map((ticket) => toTicketSummary(ticket, now));

  const activeTickets = tickets.filter((ticket) => ticket.status === "Active").length;
  const [firstEvent] = events;

  return {
    stats: [
      {
        id: "active-tickets",
        title: "Active Tickets",
        value: activeTickets,
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
        title: "Past Tickets",
        value: tickets.length - activeTickets,
        subtitle: "Used, cancelled or expired",
        icon: "clock",
      },
    ],
    nextEvent: firstEvent
      ? {
          id: firstEvent.id,
          title: firstEvent.title,
          dateTime: firstEvent.dateTime,
          location: firstEvent.location,
          imageUrl: firstEvent.imageUrl,
          ctaLabel: "View Details",
        }
      : null,
    recentTickets: tickets.slice(0, DASHBOARD_TICKET_LIMIT),
    upcomingEvents: events.slice(0, DASHBOARD_EVENT_LIMIT),
    updatedAt: now.toISOString(),
  };
}
