import { supabase } from "@/lib/supabase";
import type { CheckInResult, DiscountType, EventStatus, TicketDbStatus } from "@/lib/database.types";
import { eventImageSrc } from "@/lib/storage";
import type {
  BookResult,
  CheckInOutcome,
  TicketPhase,
  TicketResult,
  TicketView,
} from "@/features/tickets/model/tickets.types";

const TICKET_SELECT =
  "id, code, status, created_at, checked_in_at, cancelled_at, ticket_types(name), events(id, slug, title, starts_at, end_at, location, image_path, image_url, status)";

// Without an end time an event counts as running for 6 hours.
const DEFAULT_DURATION_MS = 6 * 60 * 60 * 1000;

type TicketRecord = {
  id: string;
  code: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  cancelled_at: string | null;
  ticket_types: { name: string } | null;
  events: {
    id: string;
    slug: string;
    title: string;
    starts_at: string;
    end_at: string | null;
    location: string;
    image_path: string | null;
    image_url: string | null;
    status: string;
  } | null;
};

function toView(record: TicketRecord, now = Date.now()): TicketView {
  const status = record.status as TicketDbStatus;
  const event = record.events;
  const startsAt = event ? new Date(event.starts_at).getTime() : 0;
  const endsAt = event ? (event.end_at ? new Date(event.end_at).getTime() : startsAt + DEFAULT_DURATION_MS) : 0;

  let phase: TicketPhase;
  if (status === "used") phase = "used";
  else if (status === "cancelled") phase = "cancelled";
  else phase = event && endsAt > now ? "upcoming" : "past";

  return {
    id: record.id,
    code: record.code,
    status,
    phase,
    createdAt: record.created_at,
    checkedInAt: record.checked_in_at,
    cancelledAt: record.cancelled_at,
    event: event
      ? {
          id: event.id,
          slug: event.slug,
          title: event.title,
          startsAt: event.starts_at,
          endAt: event.end_at,
          location: event.location,
          imageSrc: eventImageSrc(event.image_path, event.image_url),
          status: event.status as EventStatus,
        }
      : null,
    ticketTypeName: record.ticket_types?.name ?? null,
    eventCancelled: event?.status === "cancelled",
    // Matches cancel_my_ticket: active and the event hasn't started.
    canCancel: status === "active" && Boolean(event) && startsAt > now,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) throw new Error("Please sign in.");
  return userId;
}

export type BookOptions = {
  promoCode?: string | null;
  addons?: { id: string; quantity: number }[];
};

export async function bookTicketType(ticketTypeId: string, quantity = 1, options: BookOptions = {}): Promise<BookResult> {
  // The database checks sign-in, availability, per-type capacity, the
  // per-person limit, the promo code and add-on stock, then creates the order,
  // the tickets and a confirmation notification.
  const { data, error } = await supabase.rpc("book_ticket", {
    p_ticket_type_id: ticketTypeId,
    p_quantity: quantity,
    ...(options.promoCode ? { p_promo_code: options.promoCode } : {}),
    ...(options.addons?.length ? { p_addons: options.addons } : {}),
  });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, code: data[0]?.code };
}

export type PromoCheck = { ok: true; code: string; type: DiscountType; value: number } | { ok: false; errorMessage: string };

// Confirm a promo code before booking so the panel can show the discount.
// book_ticket checks it again.
export async function checkPromoCode(eventId: string, code: string): Promise<PromoCheck> {
  const { data, error } = await supabase.rpc("check_promo_code", { p_event_id: eventId, p_code: code.trim() });
  if (error) return { ok: false, errorMessage: error.message };
  const [row] = data;
  if (!row) return { ok: false, errorMessage: "That promo code isn't valid for this event." };
  return { ok: true, code: row.code, type: row.discount_type as DiscountType, value: Number(row.discount_value) };
}

// Tickets the user holds for one event (active or used); book_ticket counts
// these toward the per-person limit. Door-sale tickets (holder_name set) were
// sold by this user for someone else, so they don't count.
export async function countMyTicketsForEvent(eventId: string, userId: string): Promise<number> {
  const { count, error } = await supabase
    .from("tickets")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .is("holder_name", null)
    .in("status", ["active", "used"]);
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function cancelTicket(ticketId: string): Promise<TicketResult> {
  const { error } = await supabase.rpc("cancel_my_ticket", { p_ticket_id: ticketId });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true };
}

// Without an event id only admins may check in (any event).
export async function checkInTicket(code: string, eventId?: string): Promise<CheckInOutcome> {
  const { data, error } = await supabase.rpc("check_in_ticket", {
    p_code: code,
    ...(eventId ? { p_event_id: eventId } : {}),
  });
  if (error) return { ok: false, errorMessage: checkInErrorMessage(error.message) };

  const [row] = data;
  if (!row) return { ok: false, errorMessage: "Check-in failed: the server sent no answer. Please try again." };

  return {
    ok: true,
    result: row.result as CheckInResult,
    code: row.code,
    eventTitle: row.event_title,
    holderName: row.holder_name,
    checkedInAt: row.checked_in_at,
    ticketTypeName: row.ticket_type_name,
    startsAt: row.starts_at,
  };
}

function checkInErrorMessage(message: string): string {
  if (/JWT|not authenticated|session/i.test(message)) return "Your session has expired. Sign in again to keep scanning.";
  if (/Failed to fetch|NetworkError|network/i.test(message)) return "Check-in failed. Check your connection and try again.";
  return message;
}

// Always filtered by user: admins can read every ticket. Door-sale tickets
// belong to the buyer at the gate, not the staff member who sold them.
export async function listMyTickets(): Promise<TicketView[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("user_id", userId)
    .is("holder_name", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  const now = Date.now();
  return (data as unknown as TicketRecord[]).map((record) => toView(record, now));
}

export async function getMyTicketByCode(code: string): Promise<TicketView | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("code", code.toUpperCase())
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? toView(data as unknown as TicketRecord) : null;
}
