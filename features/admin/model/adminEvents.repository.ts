import { supabase } from "@/lib/supabase";
import type { EventRegion, EventStatus, Tables } from "@/lib/database.types";
import { eventImageSrc } from "@/lib/storage";
import { ilikePattern, pageRange, sanitizeSearch } from "@/lib/search";
import type {
  ActionResult,
  AdminEventFilters,
  AdminEventRow,
  EventOption,
  Paged,
} from "@/features/admin/model/admin.types";
import type { EventFormOutput } from "@/features/admin/model/eventForm.schema";

type EventWithCategory = Tables<"events"> & { categories: { name: string } | null };

const FOREIGN_KEY_VIOLATION = "23503";
const UNIQUE_VIOLATION = "23505";

async function bookedCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_event_booked_counts", { event_ids: eventIds });
  if (error) throw new Error(error.message);
  return new Map(data.map((row) => [row.event_id, row.booked]));
}

function toRow(event: EventWithCategory, sold: number): AdminEventRow {
  return {
    id: event.id,
    title: event.title,
    slug: event.slug,
    status: event.status as EventStatus,
    startsAt: event.starts_at,
    endAt: event.end_at,
    location: event.location,
    price: event.price,
    capacity: event.capacity,
    sold,
    isFeatured: event.is_featured,
    categoryId: event.category_id,
    categoryName: event.categories?.name ?? null,
    region: event.region as EventRegion,
    imageSrc: eventImageSrc(event.image_path, event.image_url),
  };
}

function friendlyError(code: string | undefined, message: string): string {
  if (code === UNIQUE_VIOLATION) return "That slug is already used by another event. Choose a different one.";
  if (code === FOREIGN_KEY_VIOLATION) return "This event has tickets, so it can't be deleted. Cancel it instead.";
  return message;
}

// Local yyyy-mm-dd -> start/end of that day in the admin's time zone.
function dayStart(date: string): string {
  return new Date(`${date}T00:00:00`).toISOString();
}
function dayEnd(date: string): string {
  return new Date(`${date}T23:59:59.999`).toISOString();
}

export async function listAdminEvents(filters: AdminEventFilters, pageSize = 20): Promise<Paged<AdminEventRow>> {
  const [from, to] = pageRange(filters.page, pageSize);
  let query = supabase
    .from("events")
    .select("*, categories(name)", { count: "exact" })
    .order("starts_at", { ascending: false })
    .range(from, to);

  const search = sanitizeSearch(filters.search);
  if (search) query = query.ilike("title", ilikePattern(search));
  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.categoryId !== "all") query = query.eq("category_id", filters.categoryId);
  if (filters.from) query = query.gte("starts_at", dayStart(filters.from));
  if (filters.to) query = query.lte("starts_at", dayEnd(filters.to));

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  const counts = await bookedCounts(data.map((event) => event.id));
  return {
    rows: data.map((event) => toRow(event, counts.get(event.id) ?? 0)),
    total: count ?? 0,
  };
}

export async function getAdminEvent(eventId: string): Promise<Tables<"events"> | null> {
  const { data, error } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function getEventSoldCount(eventId: string): Promise<number> {
  const counts = await bookedCounts([eventId]);
  return counts.get(eventId) ?? 0;
}

// Event fields. Price and capacity live on ticket types; the database keeps
// events.price ("from" price) and events.capacity (total) as summaries.
function toDbFields(values: EventFormOutput) {
  return {
    title: values.title,
    slug: values.slug,
    description: values.description || null,
    starts_at: new Date(values.startsAt).toISOString(),
    end_at: values.endAt ? new Date(values.endAt).toISOString() : null,
    location: values.location,
    max_tickets_per_user: values.maxTicketsPerUser,
    category_id: values.categoryId,
    region: values.region,
    image_path: values.imagePath,
    status: values.status,
    is_featured: values.isFeatured,
  };
}

// The admin form edits a single "General Admission" ticket type. Events with
// several ticket types keep them unchanged here.
async function syncSingleTicketType(
  eventId: string,
  price: number,
  capacity: number | null
): Promise<ActionResult<{ skipped: boolean }>> {
  const { data: types, error } = await supabase
    .from("ticket_types")
    .select("id")
    .eq("event_id", eventId);
  if (error) return { ok: false, errorMessage: error.message };

  if (types.length > 1) return { ok: true, data: { skipped: true } };

  const result =
    types.length === 0
      ? await supabase
          .from("ticket_types")
          .insert({ event_id: eventId, name: "General Admission", price, quantity: capacity })
      : await supabase.from("ticket_types").update({ price, quantity: capacity }).eq("id", types[0].id);

  if (result.error) return { ok: false, errorMessage: result.error.message };
  return { ok: true, data: { skipped: false } };
}

export async function createAdminEvent(values: EventFormOutput): Promise<ActionResult<{ id: string }>> {
  const { data, error } = await supabase.from("events").insert(toDbFields(values)).select("id").single();
  if (error) return { ok: false, errorMessage: friendlyError(error.code, error.message) };

  const tickets = await syncSingleTicketType(data.id, values.price, values.capacity);
  if (!tickets.ok) return { ok: false, errorMessage: `Event saved, but tickets failed: ${tickets.errorMessage}` };
  return { ok: true, data: { id: data.id } };
}

// keepStatus: leave status untouched (used for cancelled events, which
// can only be cancelled through cancel_event, never re-opened here).
export async function updateAdminEvent(
  eventId: string,
  values: EventFormOutput,
  options: { keepStatus?: boolean } = {}
): Promise<ActionResult<{ ticketTypesSkipped: boolean }>> {
  const { status, ...rest } = toDbFields(values);
  const { data, error } = await supabase
    .from("events")
    .update(options.keepStatus ? rest : { ...rest, status })
    .eq("id", eventId)
    .select("id");
  if (error) return { ok: false, errorMessage: friendlyError(error.code, error.message) };
  if (data.length === 0) return { ok: false, errorMessage: "Event not found or you don't have permission." };

  const tickets = await syncSingleTicketType(eventId, values.price, values.capacity);
  if (!tickets.ok) return { ok: false, errorMessage: tickets.errorMessage };
  return { ok: true, data: { ticketTypesSkipped: tickets.data.skipped } };
}

// Copies an event (and its ticket types) as a new draft with a unique slug.
export async function duplicateAdminEvent(eventId: string): Promise<ActionResult<{ id: string }>> {
  const source = await getAdminEvent(eventId);
  if (!source) return { ok: false, errorMessage: "Event not found." };

  const suffix = crypto.randomUUID().slice(0, 4);
  const { data, error } = await supabase
    .from("events")
    .insert({
      title: `${source.title} (copy)`.slice(0, 120),
      slug: `${source.slug}-copy-${suffix}`.slice(0, 80).replace(/-+$/, ""),
      description: source.description,
      starts_at: source.starts_at,
      end_at: source.end_at,
      location: source.location,
      max_tickets_per_user: source.max_tickets_per_user,
      category_id: source.category_id,
      region: source.region,
      image_path: source.image_path,
      image_url: source.image_url,
      status: "draft",
      is_featured: false,
    })
    .select("id")
    .single();

  if (error) return { ok: false, errorMessage: friendlyError(error.code, error.message) };

  const { data: types, error: typesError } = await supabase
    .from("ticket_types")
    .select("name, description, price, quantity, sales_start, sales_end, sort_order")
    .eq("event_id", eventId);
  if (typesError) return { ok: false, errorMessage: typesError.message };

  if (types.length > 0) {
    const { error: copyError } = await supabase
      .from("ticket_types")
      .insert(types.map((type) => ({ ...type, event_id: data.id })));
    if (copyError) return { ok: false, errorMessage: copyError.message };
  }

  return { ok: true, data: { id: data.id } };
}

export async function cancelAdminEvent(eventId: string, reason: string): Promise<ActionResult<number>> {
  const { data, error } = await supabase.rpc("cancel_event", {
    p_event_id: eventId,
    p_note: reason.trim() || undefined,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data };
}

export async function deleteAdminEvent(eventId: string): Promise<ActionResult> {
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("id");
  if (error) return { ok: false, errorMessage: friendlyError(error.code, error.message) };
  if (data.length === 0) return { ok: false, errorMessage: "Event not found or you don't have permission." };
  return { ok: true, data: undefined };
}

// Lightweight list for dropdowns (bookings filter, notifications).
export async function listEventOptions(): Promise<EventOption[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, status")
    .order("starts_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return data.map((event) => ({
    id: event.id,
    title: event.title,
    startsAt: event.starts_at,
    status: event.status as EventStatus,
  }));
}
