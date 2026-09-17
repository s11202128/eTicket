import { demoEvents, demoTickets } from "@/lib/demo-data";
import type { ManagedEvent } from "@/features/admin/model/admin.types";
import type { Event, Ticket, UserProfile } from "@/features/dashboard/model/dashboard.types";

type DemoState = {
  events: ManagedEvent[];
  tickets: Ticket[];
  profile: UserProfile;
};

const demoGlobal = globalThis as typeof globalThis & { __eticketDemoState?: DemoState };

export function getDemoState(): DemoState {
  if (!demoGlobal.__eticketDemoState) {
    demoGlobal.__eticketDemoState = {
      events: demoEvents.map((event) => ({
        ...event,
        ticketsSold: event.capacity - event.remainingTickets,
        published: true,
        createdAt: "2026-09-17T00:00:00.000Z",
        updatedAt: "2026-09-17T00:00:00.000Z",
      })),
      tickets: [...demoTickets],
      profile: {
        displayName: "Alex Morgan",
        email: "alex@example.com",
        phone: "+1 (212) 555-0147",
        avatarUrl: null,
        role: "admin",
      },
    };
  }

  return demoGlobal.__eticketDemoState;
}

export function toPublicDemoEvent(event: ManagedEvent): Event {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    category: event.category,
    venue: event.venue,
    location: event.location,
    startsAt: event.startsAt,
    imageUrl: event.imageUrl,
    priceCents: event.priceCents,
    currency: event.currency,
    capacity: event.capacity,
    remainingTickets: event.remainingTickets,
    featured: event.featured,
  };
}
