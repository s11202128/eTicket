import { supabase } from "@/lib/supabase";
import type { EventRegion, EventStatus, Json, OrganizerStatus } from "@/lib/database.types";
import { eventImageSrc, publicImageUrl } from "@/lib/storage";
import { ilikePattern, pageRange, sanitizeSearch } from "@/lib/search";
import type { ActionResult, Paged } from "@/features/admin/model/admin.types";

// Admin queues: organizer applications, event reviews, cancellation
// requests and the audit log. Admin-only reads are enforced by RLS; every
// decision goes through a database function that checks the admin role.

const ok = { ok: true as const, data: undefined };

// ---------------------------------------------------------------------------
// Queue badge counts
// ---------------------------------------------------------------------------
export type QueueCounts = { organizers: number; reviews: number; cancellations: number };

export async function getQueueCounts(): Promise<QueueCounts> {
  const { data, error } = await supabase.rpc("admin_queue_counts");
  if (error) throw new Error(error.message);
  const row = data[0];
  return {
    organizers: row?.pending_organizers ?? 0,
    reviews: row?.pending_events ?? 0,
    cancellations: row?.cancellation_requests ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Organizer applications
// ---------------------------------------------------------------------------
export type OrganizerApplicationRow = {
  userId: string;
  organizationName: string;
  applicantName: string | null;
  applicantEmail: string | null;
  phone: string | null;
  city: string | null;
  website: string | null;
  eventTypes: string[];
  description: string | null;
  logoUrl: string | null;
  status: OrganizerStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizerDecision = "approve" | "reject" | "suspend";

export async function listOrganizerApplications(
  status: OrganizerStatus | "all",
  search: string,
  page: number,
  pageSize = 20
): Promise<Paged<OrganizerApplicationRow>> {
  const [from, to] = pageRange(page, pageSize);
  let query = supabase
    .from("organizer_profiles")
    .select("*, profiles(full_name, email)", { count: "exact" })
    // Oldest pending first (fair queue); otherwise most recent activity first.
    .order(status === "pending" ? "created_at" : "updated_at", { ascending: status === "pending" })
    .range(from, to);
  if (status !== "all") query = query.eq("status", status);
  const term = sanitizeSearch(search);
  if (term) query = query.ilike("organization_name", ilikePattern(term));

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);

  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      userId: row.user_id,
      organizationName: row.organization_name,
      applicantName: row.profiles?.full_name ?? null,
      applicantEmail: row.profiles?.email ?? null,
      phone: row.phone,
      city: row.city,
      website: row.website,
      eventTypes: row.event_types,
      description: row.description,
      logoUrl: row.logo_path ? publicImageUrl("organizer-logos", row.logo_path) : null,
      status: row.status as OrganizerStatus,
      reviewNote: row.review_note,
      reviewedAt: row.reviewed_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    })),
  };
}

export async function reviewOrganizer(userId: string, decision: OrganizerDecision, note: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("review_organizer", {
    p_user_id: userId,
    p_decision: decision,
    p_note: note.trim() || undefined,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return ok;
}

// ---------------------------------------------------------------------------
// Organizer info used by the review and cancellation screens
// ---------------------------------------------------------------------------
export type OrganizerInfo = {
  userId: string;
  organizationName: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  status: OrganizerStatus;
  logoUrl: string | null;
  liveEvents: number;
};

async function organizerInfo(userIds: string[]): Promise<Map<string, OrganizerInfo>> {
  const ids = [...new Set(userIds)];
  if (ids.length === 0) return new Map();
  const [{ data, error }, { data: events, error: eventsError }] = await Promise.all([
    supabase
      .from("organizer_profiles")
      .select("user_id, organization_name, phone, website, status, logo_path, profiles(full_name, email)")
      .in("user_id", ids),
    supabase.from("events").select("organizer_id").in("organizer_id", ids).eq("status", "published"),
  ]);
  if (error) throw new Error(error.message);
  if (eventsError) throw new Error(eventsError.message);

  const live = new Map<string, number>();
  for (const event of events) if (event.organizer_id) live.set(event.organizer_id, (live.get(event.organizer_id) ?? 0) + 1);

  return new Map(
    data.map((row) => [
      row.user_id,
      {
        userId: row.user_id,
        organizationName: row.organization_name,
        name: row.profiles?.full_name ?? null,
        email: row.profiles?.email ?? null,
        phone: row.phone,
        website: row.website,
        status: row.status as OrganizerStatus,
        logoUrl: row.logo_path ? publicImageUrl("organizer-logos", row.logo_path) : null,
        liveEvents: live.get(row.user_id) ?? 0,
      },
    ])
  );
}

// ---------------------------------------------------------------------------
// Event review queue
// ---------------------------------------------------------------------------
export type ReviewQueueRow = {
  id: string;
  title: string;
  startsAt: string;
  location: string;
  submittedAt: string | null;
  imageSrc: string;
  organizationName: string | null;
  // Live events that changed important details come back for review.
  wasLive: boolean;
};

export async function listReviewQueue(): Promise<ReviewQueueRow[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, starts_at, location, submitted_at, image_path, image_url, organizer_id, reviewed_at")
    .eq("status", "pending_review")
    .order("submitted_at", { ascending: true, nullsFirst: false });
  if (error) throw new Error(error.message);

  const organizers = await organizerInfo(data.flatMap((row) => (row.organizer_id ? [row.organizer_id] : [])));
  const ids = data.map((row) => row.id);
  const { data: liveEdits } = ids.length
    ? await supabase.from("audit_log").select("target_id").eq("action", "event.updated_live").in("target_id", ids)
    : { data: [] as { target_id: string | null }[] };
  const wasLive = new Set((liveEdits ?? []).map((row) => row.target_id));

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    location: row.location,
    submittedAt: row.submitted_at,
    imageSrc: eventImageSrc(row.image_path, row.image_url),
    organizationName: row.organizer_id ? (organizers.get(row.organizer_id)?.organizationName ?? null) : null,
    wasLive: wasLive.has(row.id) && Boolean(row.reviewed_at),
  }));
}

export type HistoryEntry = {
  id: number;
  action: string;
  actorName: string | null;
  note: string | null;
  createdAt: string;
};

export type EventForReview = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  status: EventStatus;
  startsAt: string;
  endAt: string | null;
  location: string;
  region: EventRegion;
  imageSrc: string;
  categoryName: string | null;
  maxTicketsPerUser: number;
  price: number;
  capacity: number | null;
  reviewNote: string | null;
  submittedAt: string | null;
  ticketTypes: { id: string; name: string; price: number; quantity: number | null; salesStart: string | null; salesEnd: string | null; sold: number }[];
  organizer: OrganizerInfo | null;
  history: HistoryEntry[];
};

async function actorNames(ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, full_name, email").in("id", unique);
  if (error) throw new Error(error.message);
  return new Map(data.map((row) => [row.id, row.full_name || row.email || "Unknown"]));
}

const noteOf = (details: Json): string | null => {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const note = (details as Record<string, Json>).note ?? (details as Record<string, Json>).reason;
    return typeof note === "string" ? note : null;
  }
  return null;
};

export async function listEventHistory(eventId: string): Promise<HistoryEntry[]> {
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, action, actor_id, details, created_at")
    .eq("target_type", "event")
    .eq("target_id", eventId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const names = await actorNames(data.flatMap((row) => (row.actor_id ? [row.actor_id] : [])));
  return data.map((row) => ({
    id: row.id,
    action: row.action,
    actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
    note: noteOf(row.details),
    createdAt: row.created_at,
  }));
}

export async function getEventForReview(eventId: string): Promise<EventForReview | null> {
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, slug, title, description, status, starts_at, end_at, location, region, image_path, image_url, max_tickets_per_user, price, capacity, review_note, submitted_at, organizer_id, categories(name)"
    )
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  const [types, counts, organizers, history] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price, quantity, sales_start, sales_end")
      .eq("event_id", eventId)
      .order("sort_order")
      .order("price"),
    supabase.rpc("get_ticket_type_counts", { p_event_ids: [eventId] }),
    organizerInfo(data.organizer_id ? [data.organizer_id] : []),
    listEventHistory(eventId),
  ]);
  if (types.error) throw new Error(types.error.message);
  if (counts.error) throw new Error(counts.error.message);
  const sold = new Map(counts.data.map((row) => [row.ticket_type_id, row.sold]));

  return {
    id: data.id,
    slug: data.slug,
    title: data.title,
    description: data.description,
    status: data.status as EventStatus,
    startsAt: data.starts_at,
    endAt: data.end_at,
    location: data.location,
    region: data.region as EventRegion,
    imageSrc: eventImageSrc(data.image_path, data.image_url),
    categoryName: data.categories?.name ?? null,
    maxTicketsPerUser: data.max_tickets_per_user,
    price: Number(data.price),
    capacity: data.capacity,
    reviewNote: data.review_note,
    submittedAt: data.submitted_at,
    ticketTypes: types.data.map((type) => ({
      id: type.id,
      name: type.name,
      price: Number(type.price),
      quantity: type.quantity,
      salesStart: type.sales_start,
      salesEnd: type.sales_end,
      sold: sold.get(type.id) ?? 0,
    })),
    organizer: data.organizer_id ? (organizers.get(data.organizer_id) ?? null) : null,
    history,
  };
}

export type EventDecision = "approve" | "request_changes" | "reject";

export async function reviewEvent(eventId: string, decision: EventDecision, note: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("review_event", {
    p_event_id: eventId,
    p_decision: decision,
    p_note: note.trim() || undefined,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return ok;
}

// ---------------------------------------------------------------------------
// Cancellation requests
// ---------------------------------------------------------------------------
export type CancellationRequest = {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  startsAt: string;
  reason: string | null;
  sold: number;
  organizer: OrganizerInfo | null;
  requestedAt: string | null;
};

export async function listCancellationRequests(): Promise<CancellationRequest[]> {
  const { data, error } = await supabase
    .from("events")
    .select("id, title, slug, status, starts_at, cancellation_reason, organizer_id")
    .eq("cancellation_requested", true)
    .neq("status", "cancelled")
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (data.length === 0) return [];

  const ids = data.map((row) => row.id);
  const [organizers, counts, requests] = await Promise.all([
    organizerInfo(data.flatMap((row) => (row.organizer_id ? [row.organizer_id] : []))),
    supabase.rpc("get_event_booked_counts", { event_ids: ids }),
    supabase
      .from("audit_log")
      .select("target_id, created_at")
      .eq("action", "event.cancellation_requested")
      .in("target_id", ids)
      .order("created_at", { ascending: false }),
  ]);
  if (counts.error) throw new Error(counts.error.message);
  const sold = new Map(counts.data.map((row) => [row.event_id, row.booked]));
  const requestedAt = new Map<string, string>();
  for (const row of requests.data ?? []) if (row.target_id && !requestedAt.has(row.target_id)) requestedAt.set(row.target_id, row.created_at);

  return data.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as EventStatus,
    startsAt: row.starts_at,
    reason: row.cancellation_reason,
    sold: sold.get(row.id) ?? 0,
    organizer: row.organizer_id ? (organizers.get(row.organizer_id) ?? null) : null,
    requestedAt: requestedAt.get(row.id) ?? null,
  }));
}

export async function declineCancellation(eventId: string, note: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("decline_event_cancellation", { p_event_id: eventId, p_note: note.trim() });
  if (error) return { ok: false, errorMessage: error.message };
  return ok;
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------
export type AuditFilters = {
  action: string; // exact action, "" for all
  targetType: string; // "event" | "organizer" | ..., "" for all
  from: string; // yyyy-mm-dd (local), "" for no limit
  to: string;
  page: number;
};

export type AuditRow = {
  id: number;
  action: string;
  targetType: string;
  targetId: string | null;
  actorName: string | null;
  details: Json;
  createdAt: string;
};

export async function listAuditLog(filters: AuditFilters, pageSize = 30): Promise<Paged<AuditRow>> {
  const [from, to] = pageRange(filters.page, pageSize);
  let query = supabase
    .from("audit_log")
    .select("id, action, target_type, target_id, actor_id, details, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);
  if (filters.action) query = query.eq("action", filters.action);
  if (filters.targetType) query = query.eq("target_type", filters.targetType);
  if (filters.from) query = query.gte("created_at", new Date(`${filters.from}T00:00:00`).toISOString());
  if (filters.to) {
    const end = new Date(`${filters.to}T00:00:00`);
    end.setDate(end.getDate() + 1);
    query = query.lt("created_at", end.toISOString());
  }

  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  const names = await actorNames(data.flatMap((row) => (row.actor_id ? [row.actor_id] : [])));

  return {
    total: count ?? 0,
    rows: data.map((row) => ({
      id: row.id,
      action: row.action,
      targetType: row.target_type,
      targetId: row.target_id,
      actorName: row.actor_id ? (names.get(row.actor_id) ?? null) : null,
      details: row.details,
      createdAt: row.created_at,
    })),
  };
}
