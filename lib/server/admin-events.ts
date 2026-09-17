import type {
  AdminEventInput,
  AdminOverview,
  ManagedEvent,
} from "@/features/admin/model/admin.types";

type EventRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  venue: string;
  location: string;
  starts_at: string;
  image_url: string;
  price_cents: number;
  currency: string;
  capacity: number;
  tickets_sold: number;
  featured: boolean;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export const ADMIN_EVENT_COLUMNS = "id,title,description,category,venue,location,starts_at,image_url,price_cents,currency,capacity,tickets_sold,featured,published,created_at,updated_at";

export function mapManagedEvent(row: EventRow): ManagedEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    venue: row.venue,
    location: row.location,
    startsAt: row.starts_at,
    imageUrl: row.image_url,
    priceCents: row.price_cents,
    currency: row.currency,
    capacity: row.capacity,
    ticketsSold: row.tickets_sold,
    remainingTickets: Math.max(row.capacity - row.tickets_sold, 0),
    featured: row.featured,
    published: row.published,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toEventRow(input: AdminEventInput) {
  return {
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category.trim(),
    venue: input.venue.trim(),
    location: input.location.trim(),
    starts_at: new Date(input.startsAt).toISOString(),
    image_url: input.imageUrl.trim(),
    price_cents: input.priceCents,
    currency: input.currency.trim().toUpperCase(),
    capacity: input.capacity,
    featured: input.featured,
    published: input.published,
    updated_at: new Date().toISOString(),
  };
}

export function parseEventInput(value: unknown): { input?: AdminEventInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "Enter the event details." };
  const body = value as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === "string" ? body[key].trim() : "";
  const title = text("title");
  const description = text("description");
  const category = text("category");
  const venue = text("venue");
  const location = text("location");
  const startsAt = text("startsAt");
  const imageUrl = text("imageUrl");
  const currency = text("currency").toUpperCase();
  const priceCents = body.priceCents;
  const capacity = body.capacity;

  if (title.length < 2 || title.length > 140) return { error: "Event title must be between 2 and 140 characters." };
  if (description.length > 2000) return { error: "Description must be 2,000 characters or fewer." };
  if (!category || !venue || !location) return { error: "Category, venue, and location are required." };
  if (!startsAt || Number.isNaN(Date.parse(startsAt))) return { error: "Choose a valid event date and time." };
  try {
    const url = new URL(imageUrl);
    if (url.protocol !== "https:") throw new Error();
  } catch {
    return { error: "Enter a valid https image URL." };
  }
  if (!Number.isInteger(priceCents) || (priceCents as number) < 0) return { error: "Price must be zero or a positive whole number of cents." };
  if (!/^[A-Z]{3}$/.test(currency)) return { error: "Currency must be a three-letter code such as SBD." };
  if (!Number.isInteger(capacity) || (capacity as number) < 1) return { error: "Capacity must be a positive whole number." };
  if (typeof body.featured !== "boolean" || typeof body.published !== "boolean") return { error: "Featured and publishing states are required." };

  return {
    input: {
      title,
      description,
      category,
      venue,
      location,
      startsAt: new Date(startsAt).toISOString(),
      imageUrl,
      priceCents: priceCents as number,
      currency,
      capacity: capacity as number,
      featured: body.featured,
      published: body.published,
    },
  };
}

export function calculateOverview(events: ManagedEvent[]): AdminOverview {
  const totalCapacity = events.reduce((sum, event) => sum + event.capacity, 0);
  const ticketsIssued = events.reduce((sum, event) => sum + event.ticketsSold, 0);
  return {
    totalEvents: events.length,
    liveEvents: events.filter((event) => event.published).length,
    draftEvents: events.filter((event) => !event.published).length,
    ticketsIssued,
    totalCapacity,
    occupancyRate: totalCapacity ? Math.round((ticketsIssued / totalCapacity) * 100) : 0,
  };
}
