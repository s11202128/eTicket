import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import { eventImageSrc } from "@/lib/storage";
import type { EventDetails, EventRecord, EventSummary } from "@/features/events/model/events.types";

// Read-only: events are created and edited in the admin dashboard.

// Seat counts come from a database function because row-level security
// hides other users' tickets.
async function fetchBookedCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_event_booked_counts", {
    event_ids: eventIds,
  });

  if (error) {
    throw new Error(error.message);
  }

  return new Map(data.map((row) => [row.event_id, row.booked]));
}

function toEventDetails(event: EventRecord, booked: number, now: Date): EventDetails {
  const spotsLeft = event.capacity === null ? null : Math.max(event.capacity - booked, 0);

  return {
    id: event.id,
    title: event.title,
    date: formatDate(event.starts_at),
    dateTime: formatDateTime(event.starts_at),
    location: event.location,
    price: formatPrice(event.price),
    imageUrl: eventImageSrc(event.image_path, event.image_url),
    spotsLeft,
    isSoldOut: spotsLeft === 0,
    isPast: new Date(event.starts_at) < now,
    description: event.description,
    startsAtIso: event.starts_at,
    priceValue: event.price,
    imageUrlRaw: event.image_url,
    capacity: event.capacity,
    booked,
    createdBy: event.created_by,
  };
}

async function toEventDetailsList(events: EventRecord[]): Promise<EventDetails[]> {
  const counts = await fetchBookedCounts(events.map((event) => event.id));
  const now = new Date();
  return events.map((event) => toEventDetails(event, counts.get(event.id) ?? 0, now));
}

export async function getEventRecord(eventId: string): Promise<EventRecord | null> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getEventDetails(eventId: string): Promise<EventDetails | null> {
  const event = await getEventRecord(eventId);
  if (!event) return null;

  const [details] = await toEventDetailsList([event]);
  return details;
}

export async function listUpcomingEvents(limit?: number): Promise<EventSummary[]> {
  let query = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return toEventDetailsList(data);
}
