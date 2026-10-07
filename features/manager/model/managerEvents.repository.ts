import { supabase } from "@/lib/supabase";
import type { EventStatus, Json } from "@/lib/database.types";
import { slugify, toDateTimeLocalValue } from "@/lib/format";
import { eventImageSrc, uploadImage, type UploadResult } from "@/lib/storage";
import type { TicketTypeValues, WizardValues } from "@/features/manager/model/eventWizard";
import { validateStep } from "@/features/manager/model/eventWizard";

// Everything here runs as the signed-in organizer; row-level security and
// the event functions decide what's allowed.

export type ActionResult = { ok: true } | { ok: false; errorMessage: string };

export type ManagerEventSummary = {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  startsAt: string;
  endAt: string | null;
  location: string;
  imageSrc: string;
  reviewNote: string | null;
  cancellationRequested: boolean;
  submittedAt: string | null;
  // null = unlimited
  capacity: number | null;
  sold: number;
};

export type EventMeta = ManagerEventSummary & {
  imagePath: string | null;
  cancellationReason: string | null;
  categoryId: string | null;
};

const SUMMARY_COLUMNS =
  "id, title, slug, status, starts_at, end_at, location, image_path, image_url, review_note, cancellation_requested, cancellation_reason, submitted_at, capacity, category_id";

type SummaryRow = {
  id: string;
  title: string;
  slug: string;
  status: string;
  starts_at: string;
  end_at: string | null;
  location: string;
  image_path: string | null;
  image_url: string | null;
  review_note: string | null;
  cancellation_requested: boolean;
  cancellation_reason: string | null;
  submitted_at: string | null;
  capacity: number | null;
  category_id: string | null;
};

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Please sign in.");
  return userId;
}

function toMeta(row: SummaryRow, sold: number): EventMeta {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as EventStatus,
    startsAt: row.starts_at,
    endAt: row.end_at,
    location: row.location,
    imageSrc: eventImageSrc(row.image_path, row.image_url),
    imagePath: row.image_path,
    reviewNote: row.review_note,
    cancellationRequested: row.cancellation_requested,
    cancellationReason: row.cancellation_reason,
    submittedAt: row.submitted_at,
    capacity: row.capacity,
    categoryId: row.category_id,
    sold,
  };
}

async function bookedCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const { data, error } = await supabase.rpc("get_event_booked_counts", { event_ids: eventIds });
  if (error) throw new Error(error.message);
  return new Map(data.map((row) => [row.event_id, row.booked]));
}

// The organizer's own events, soonest first.
export async function listMyEvents(): Promise<EventMeta[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("events")
    .select(SUMMARY_COLUMNS)
    .eq("organizer_id", userId)
    .order("starts_at", { ascending: true });
  if (error) throw new Error(error.message);
  const counts = await bookedCounts(data.map((row) => row.id));
  return data.map((row) => toMeta(row, counts.get(row.id) ?? 0));
}

export async function getMyEvent(eventId: string): Promise<EventMeta | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("events")
    .select(SUMMARY_COLUMNS)
    .eq("id", eventId)
    .eq("organizer_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const counts = await bookedCounts([data.id]);
  return toMeta(data, counts.get(data.id) ?? 0);
}

// ---------------------------------------------------------------------------
// Ticket types
// ---------------------------------------------------------------------------
export type TicketTypeStats = {
  id: string;
  name: string;
  price: number;
  quantity: number | null;
  salesStart: string | null;
  salesEnd: string | null;
  sold: number;
};

export async function listTicketTypes(eventId: string): Promise<TicketTypeStats[]> {
  const { data, error } = await supabase
    .from("ticket_types")
    .select("id, name, price, quantity, sales_start, sales_end")
    .eq("event_id", eventId)
    .order("sort_order")
    .order("price");
  if (error) throw new Error(error.message);

  const { data: counts, error: countError } = await supabase.rpc("get_ticket_type_counts", { p_event_ids: [eventId] });
  if (countError) throw new Error(countError.message);
  const sold = new Map(counts.map((row) => [row.ticket_type_id, row.sold]));

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    quantity: row.quantity,
    salesStart: row.sales_start,
    salesEnd: row.sales_end,
    sold: sold.get(row.id) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Wizard: load, autosave drafts, submit, edit live events
// ---------------------------------------------------------------------------
export type EditableEvent = { meta: EventMeta; values: WizardValues };

const toLocal = (iso: string | null) => (iso ? toDateTimeLocalValue(iso) : "");
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

export async function getEditableEvent(eventId: string): Promise<EditableEvent | null> {
  const [meta, types, extra] = await Promise.all([
    getMyEvent(eventId),
    listTicketTypes(eventId),
    supabase.from("events").select("description, region, max_tickets_per_user").eq("id", eventId).maybeSingle(),
  ]);
  if (!meta || !extra.data) return null;

  return {
    meta,
    values: {
      title: meta.title,
      categoryId: meta.categoryId ?? "",
      description: extra.data.description ?? "",
      startsAt: toLocal(meta.startsAt),
      endAt: toLocal(meta.endAt),
      location: meta.location,
      region: extra.data.region as WizardValues["region"],
      maxTicketsPerUser: String(extra.data.max_tickets_per_user),
      imagePath: meta.imagePath,
      ticketTypes: types.map((type) => ({
        id: type.id,
        key: type.id,
        name: type.name,
        price: String(type.price),
        quantity: type.quantity === null ? "" : String(type.quantity),
        salesStart: toLocal(type.salesStart),
        salesEnd: toLocal(type.salesEnd),
        sold: type.sold,
      })),
    },
  };
}

// Placeholder schedule for a brand-new draft (the organizer fills it in on
// step 2; submitting checks it properly).
const PLACEHOLDER_LOCATION = "To be announced";
function placeholderStart(): string {
  const date = new Date();
  date.setDate(date.getDate() + 30);
  date.setHours(19, 0, 0, 0);
  return date.toISOString();
}

function eventFields(values: WizardValues) {
  return {
    title: values.title.trim(),
    description: values.description.trim() || null,
    category_id: values.categoryId || null,
    region: values.region,
    max_tickets_per_user: Number(values.maxTicketsPerUser) || 4,
    image_path: values.imagePath,
    ...(values.startsAt ? { starts_at: toIso(values.startsAt)! } : {}),
    end_at: toIso(values.endAt),
    ...(values.location.trim() ? { location: values.location.trim() } : {}),
  };
}

function friendlyError(message: string): string {
  if (/tickets_ticket_type_id_fkey|violates foreign key/i.test(message)) {
    return "A ticket type that already has bookings can't be removed.";
  }
  if (/ticket_types_unique_name/.test(message)) return "Each ticket type needs a different name.";
  if (/events_end_after_start/.test(message)) return "The end must be after the start.";
  return message;
}

export async function createDraft(values: WizardValues): Promise<{ ok: true; id: string } | { ok: false; errorMessage: string }> {
  const suffix = crypto.randomUUID().slice(0, 6);
  const { data, error } = await supabase
    .from("events")
    .insert({
      ...eventFields(values),
      slug: `${slugify(values.title) || "event"}-${suffix}`.replace(/^-+/, ""),
      starts_at: toIso(values.startsAt) ?? placeholderStart(),
      location: values.location.trim() || PLACEHOLDER_LOCATION,
    })
    .select("id")
    .single();
  if (error) return { ok: false, errorMessage: friendlyError(error.message) };
  return { ok: true, id: data.id };
}

// Saves a draft (or an event with changes requested). Ticket types are only
// written once the Tickets step is valid. Returns database ids for new rows.
export async function saveDraft(
  eventId: string,
  values: WizardValues,
  removedTypeIds: string[]
): Promise<{ ok: true; newTypeIds: Record<string, string> } | { ok: false; errorMessage: string }> {
  const { error } = await supabase.from("events").update(eventFields(values)).eq("id", eventId);
  if (error) return { ok: false, errorMessage: friendlyError(error.message) };

  const newTypeIds: Record<string, string> = {};
  const ticketErrors = validateStep("tickets", values, new Date());
  const typesValid = !Object.keys(ticketErrors).some((key) => key.startsWith("ticketTypes"));
  if (!typesValid) return { ok: true, newTypeIds };

  if (removedTypeIds.length > 0) {
    const { error: deleteError } = await supabase.from("ticket_types").delete().in("id", removedTypeIds);
    if (deleteError) return { ok: false, errorMessage: friendlyError(deleteError.message) };
  }

  for (const [index, type] of values.ticketTypes.entries()) {
    const row = ticketTypeRow(type, index);
    if (type.id) {
      const { error: updateError } = await supabase.from("ticket_types").update(row).eq("id", type.id);
      if (updateError) return { ok: false, errorMessage: friendlyError(updateError.message) };
    } else {
      const { data, error: insertError } = await supabase
        .from("ticket_types")
        .insert({ ...row, event_id: eventId })
        .select("id")
        .single();
      if (insertError) return { ok: false, errorMessage: friendlyError(insertError.message) };
      newTypeIds[type.key] = data.id;
    }
  }
  return { ok: true, newTypeIds };
}

function ticketTypeRow(type: TicketTypeValues, index: number) {
  return {
    name: type.name.trim(),
    price: Math.round(Number(type.price) * 100) / 100,
    quantity: type.quantity.trim() === "" ? null : Number(type.quantity),
    sales_start: toIso(type.salesStart),
    sales_end: toIso(type.salesEnd),
    sort_order: index,
  };
}

export async function submitForReview(eventId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("submit_event_for_review", { p_event_id: eventId });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

export type LiveUpdateResult =
  | { ok: true; requiresReview: boolean }
  | { ok: false; errorMessage: string };

// Live events change through update_published_event(); only changed fields are sent.
export async function updateLiveEvent(eventId: string, original: WizardValues, edited: WizardValues): Promise<LiveUpdateResult> {
  const changes: Record<string, Json> = {};
  if (edited.title.trim() !== original.title.trim()) changes.title = edited.title.trim();
  if (edited.description.trim() !== original.description.trim()) changes.description = edited.description.trim();
  if (edited.imagePath !== original.imagePath) changes.image_path = edited.imagePath;
  if (edited.startsAt !== original.startsAt) changes.starts_at = toIso(edited.startsAt);
  if (edited.endAt !== original.endAt) changes.end_at = toIso(edited.endAt);
  if (edited.location.trim() !== original.location.trim()) changes.location = edited.location.trim();
  if (edited.region !== original.region) changes.region = edited.region;
  if (edited.categoryId !== original.categoryId) changes.category_id = edited.categoryId || null;
  if (edited.maxTicketsPerUser !== original.maxTicketsPerUser) changes.max_tickets_per_user = Number(edited.maxTicketsPerUser);

  const typeChanges = edited.ticketTypes
    .filter((type) => {
      const before = original.ticketTypes.find((item) => item.id === type.id);
      return before && (Number(before.price) !== Number(type.price) || before.quantity !== type.quantity);
    })
    .map((type) => ({
      id: type.id,
      price: Number(type.price),
      quantity: type.quantity.trim() === "" ? null : Number(type.quantity),
    }));
  if (typeChanges.length > 0) changes.ticket_types = typeChanges;

  const { data, error } = await supabase.rpc("update_published_event", { p_event_id: eventId, p_changes: changes });
  if (error) return { ok: false, errorMessage: error.message };
  const result = data as { requires_review?: boolean } | null;
  return { ok: true, requiresReview: Boolean(result?.requires_review) };
}

export async function requestCancellation(eventId: string, reason: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("request_event_cancellation", { p_event_id: eventId, p_reason: reason });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

export async function deleteDraft(eventId: string): Promise<ActionResult> {
  const { data, error } = await supabase.from("events").delete().eq("id", eventId).select("id");
  if (error) return { ok: false, errorMessage: error.message };
  if (data.length === 0) return { ok: false, errorMessage: "Only drafts can be deleted." };
  return { ok: true };
}

export async function uploadEventImage(file: File): Promise<UploadResult> {
  const userId = await requireUserId();
  return uploadImage("event-images", file, userId);
}

export async function listCategories(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await supabase.from("categories").select("id, name").order("sort_order").order("name");
  if (error) throw new Error(error.message);
  return data;
}
