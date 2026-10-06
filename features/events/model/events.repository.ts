import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime, formatPrice } from "@/lib/format";
import type {
  CreateEventResult,
  EventDetails,
  EventInput,
  EventRecord,
  EventResult,
  EventSummary,
} from "@/features/events/model/events.types";

export const FALLBACK_EVENT_IMAGE =
  "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?auto=format&fit=crop&w=1400&q=80";

function toRow(input: EventInput) {
  return {
    title: input.title,
    description: input.description,
    starts_at: input.startsAt,
    location: input.location,
    price: input.price,
    capacity: input.capacity,
    image_url: input.imageUrl,
  };
}

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
    imageUrl: event.image_url || FALLBACK_EVENT_IMAGE,
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

export async function createEvent(input: EventInput): Promise<CreateEventResult> {
  // created_by defaults to auth.uid() in the database.
  const { data, error } = await supabase
    .from("events")
    .insert(toRow(input))
    .select("id")
    .single();

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true, eventId: data.id };
}

export async function updateEvent(eventId: string, input: EventInput): Promise<EventResult> {
  const { data, error } = await supabase
    .from("events")
    .update(toRow(input))
    .eq("id", eventId)
    .select("id");

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  // Row-level security silently skips events the user doesn't own.
  if (data.length === 0) {
    return { ok: false, errorMessage: "You can only edit events you created." };
  }

  return { ok: true };
}

export async function deleteEvent(eventId: string): Promise<EventResult> {
  const { data, error } = await supabase
    .from("events")
    .delete()
    .eq("id", eventId)
    .select("id");

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if (data.length === 0) {
    return { ok: false, errorMessage: "You can only delete events you created." };
  }

  return { ok: true };
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

export async function listEventsCreatedBy(userId: string): Promise<EventDetails[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("created_by", userId)
    .order("starts_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return toEventDetailsList(data);
}
