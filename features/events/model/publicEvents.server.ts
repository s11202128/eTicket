import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventRegion, EventStatus } from "@/lib/database.types";
import { regionsForFilter } from "@/lib/regions";
import { ilikePattern, sanitizeSearch } from "@/lib/search";
import { FALLBACK_EVENT_IMAGE } from "@/lib/storage";
import { parseAnnouncement, parseHero } from "@/lib/siteContent";
import type {
  AnnouncementView,
  EventListFilters,
  EventRecord,
  HeroContentView,
  PublicCategory,
  PublicEvent,
  PublicOrganizer,
} from "@/features/events/model/events.types";
import type { PublicTicketType } from "@/features/events/model/ticketAvailability";

// Server-side reads for public pages. Row-level security limits every query
// to published events (plus events the viewer holds tickets for).

export const EVENTS_PAGE_SIZE = 12;

type Supabase = Awaited<ReturnType<typeof createSupabaseServerClient>>;
type EventRow = EventRecord & { categories: { name: string; slug: string } | null };

const EVENT_SELECT = "*, categories(name, slug)";

function storageUrl(bucket: string, path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${bucket}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function imageSrc(event: EventRecord): string {
  if (event.image_path) return storageUrl("event-images", event.image_path);
  return event.image_url || FALLBACK_EVENT_IMAGE;
}

async function bookedCounts(supabase: Supabase, ids: string[]): Promise<Map<string, number>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_event_booked_counts", { event_ids: ids });
  if (error) throw new Error(error.message);
  return new Map(data.map((row) => [row.event_id, row.booked]));
}

function toPublicEvent(event: EventRow, sold: number, now: Date): PublicEvent {
  const spotsLeft = event.capacity === null ? null : Math.max(event.capacity - sold, 0);
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    description: event.description,
    startsAt: event.starts_at,
    endAt: event.end_at,
    location: event.location,
    price: event.price,
    imageSrc: imageSrc(event),
    categoryName: event.categories?.name ?? null,
    categorySlug: event.categories?.slug ?? null,
    capacity: event.capacity,
    sold,
    spotsLeft,
    isSoldOut: spotsLeft === 0,
    isPast: new Date(event.starts_at) <= now,
    maxTicketsPerUser: event.max_tickets_per_user,
    status: event.status as EventStatus,
    region: event.region as EventRegion,
    organizerId: event.organizer_id,
  };
}

async function withCounts(supabase: Supabase, rows: EventRow[]): Promise<PublicEvent[]> {
  const counts = await bookedCounts(supabase, rows.map((row) => row.id));
  const now = new Date();
  return rows.map((row) => toPublicEvent(row, counts.get(row.id) ?? 0, now));
}

export async function listCategories(): Promise<PublicCategory[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("categories").select("id, name, slug").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return data;
}

export async function getSiteChrome(): Promise<{ announcement: AnnouncementView }> {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("site_content").select("value").eq("key", "announcement").maybeSingle();
  return { announcement: parseAnnouncement(data?.value) };
}

export async function getHomeData(): Promise<{
  hero: HeroContentView;
  featured: PublicEvent[];
  upcoming: PublicEvent[];
  categories: PublicCategory[];
}> {
  const supabase = await createSupabaseServerClient();
  const nowIso = new Date().toISOString();

  const [heroResult, featuredResult, upcomingResult, categories] = await Promise.all([
    supabase.from("site_content").select("value").eq("key", "hero").maybeSingle(),
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .eq("is_featured", true)
      .gt("starts_at", nowIso)
      .order("featured_order", { ascending: true, nullsFirst: false })
      .limit(6),
    supabase
      .from("events")
      .select(EVENT_SELECT)
      .eq("status", "published")
      .gt("starts_at", nowIso)
      .order("starts_at")
      .limit(8),
    listCategories(),
  ]);

  if (featuredResult.error) throw new Error(featuredResult.error.message);
  if (upcomingResult.error) throw new Error(upcomingResult.error.message);

  const hero = parseHero(heroResult.data?.value);
  const [featured, upcoming] = await Promise.all([
    withCounts(supabase, featuredResult.data as EventRow[]),
    withCounts(supabase, upcomingResult.data as EventRow[]),
  ]);

  return {
    hero: {
      title: hero.title,
      subtitle: hero.subtitle,
      ctaText: hero.ctaText,
      imageSrc: hero.imagePath ? storageUrl("site-images", hero.imagePath) : null,
    },
    featured,
    upcoming,
    categories,
  };
}

export async function listPublicEvents(filters: EventListFilters): Promise<{ events: PublicEvent[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  const from = (filters.page - 1) * EVENTS_PAGE_SIZE;

  // !inner on categories only when filtering by category.
  const select = filters.category ? "*, categories!inner(name, slug)" : EVENT_SELECT;
  let query = supabase
    .from("events")
    .select(select, { count: "exact" })
    .eq("status", "published")
    .gt("starts_at", filters.from && filters.from > new Date().toISOString() ? filters.from : new Date().toISOString())
    .order("starts_at")
    .range(from, from + EVENTS_PAGE_SIZE - 1);

  const search = sanitizeSearch(filters.q);
  if (search) {
    const pattern = ilikePattern(search);
    query = query.or(`title.ilike."${pattern}",location.ilike."${pattern}"`);
  }
  if (filters.category) query = query.eq("categories.slug", filters.category);
  const regions = regionsForFilter(filters.region);
  if (regions) query = query.in("region", [...regions]);
  if (filters.to) query = query.lte("starts_at", filters.to);

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { events: await withCounts(supabase, data as unknown as EventRow[]), total: count ?? 0 };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// By slug; old links used the event id, so ids resolve too. cache() shares
// one lookup per request between metadata, the page and the OG image.
export const getPublicEvent = cache(async (slugOrId: string): Promise<PublicEvent | null> => {
  const supabase = await createSupabaseServerClient();
  const column = UUID.test(slugOrId) ? "id" : "slug";
  const { data, error } = await supabase.from("events").select(EVENT_SELECT).eq(column, slugOrId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const [event] = await withCounts(supabase, [data as EventRow]);
  return event;
});

// Ticket types in display order with tickets sold, for the booking panel.
export const getPublicTicketTypes = cache(async (eventId: string): Promise<PublicTicketType[]> => {
  const supabase = await createSupabaseServerClient();
  const [{ data, error }, { data: counts, error: countError }] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, description, price, quantity, sales_start, sales_end")
      .eq("event_id", eventId)
      .order("sort_order")
      .order("price"),
    supabase.rpc("get_ticket_type_counts", { p_event_ids: [eventId] }),
  ]);
  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);
  const sold = new Map(counts.map((row) => [row.ticket_type_id, row.sold]));
  return data.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    quantity: row.quantity,
    sold: sold.get(row.id) ?? 0,
    salesStart: row.sales_start,
    salesEnd: row.sales_end,
  }));
});

// Approved (or suspended, so existing events keep their host) organizers only.
export const getPublicOrganizer = cache(async (organizerId: string): Promise<PublicOrganizer | null> => {
  if (!UUID.test(organizerId)) return null;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_public_organizers", { p_user_ids: [organizerId] });
  if (error) throw new Error(error.message);
  const row = data[0];
  if (!row) return null;
  return {
    id: row.user_id,
    name: row.organization_name,
    logoUrl: row.logo_path ? storageUrl("organizer-logos", row.logo_path) : null,
    description: row.description,
    website: row.website,
    city: row.city,
  };
});

// An organizer's published events that haven't started yet, soonest first.
export async function listOrganizerEvents(organizerId: string): Promise<PublicEvent[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("events")
    .select(EVENT_SELECT)
    .eq("organizer_id", organizerId)
    .eq("status", "published")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true })
    .limit(60);
  if (error) throw new Error(error.message);
  return withCounts(supabase, data as EventRow[]);
}
