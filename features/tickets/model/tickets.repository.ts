import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/format";
import type { CheckInResult } from "@/lib/database.types";
import type {
  CheckInOutcome,
  TicketResult,
  TicketStatus,
  TicketSummary,
  TicketWithEvent,
} from "@/features/tickets/model/tickets.types";

const TICKET_SELECT = "*, events(id, title, starts_at, location)";

export function ticketQrUrl(code: string, size = 120): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    `ETICKET-${code}`
  )}`;
}

function toTicketStatus(ticket: TicketWithEvent, now: Date): TicketStatus {
  if (ticket.status === "used") return "Used";
  if (ticket.status === "cancelled") return "Cancelled";
  if (ticket.events && new Date(ticket.events.starts_at) < now) return "Expired";
  return "Active";
}

export function toTicketSummary(ticket: TicketWithEvent, now = new Date()): TicketSummary {
  return {
    id: ticket.id,
    eventId: ticket.events?.id ?? null,
    eventTitle: ticket.events?.title ?? "Event removed",
    date: ticket.events ? formatDate(ticket.events.starts_at) : "",
    dateTime: ticket.events ? formatDateTime(ticket.events.starts_at) : "",
    location: ticket.events?.location ?? "",
    status: toTicketStatus(ticket, now),
    code: ticket.code,
    qrImageUrl: ticketQrUrl(ticket.code),
  };
}

export async function bookTicket(eventId: string): Promise<TicketResult> {
  // The database function checks sign-in, availability, capacity and the
  // per-user limit, then creates the ticket and a confirmation notification.
  const { error } = await supabase.rpc("book_ticket", { p_event_id: eventId });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}

export async function cancelTicket(ticketId: string): Promise<TicketResult> {
  const { error } = await supabase.rpc("cancel_my_ticket", { p_ticket_id: ticketId });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  return { ok: true };
}

export async function checkInTicket(code: string): Promise<CheckInOutcome> {
  const { data, error } = await supabase.rpc("check_in_ticket", { p_code: code });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  const [row] = data;
  if (!row) {
    return { ok: false, errorMessage: "Check-in failed. Please try again." };
  }

  return {
    ok: true,
    result: row.result as CheckInResult,
    code: row.code,
    eventTitle: row.event_title,
    holderName: row.holder_name,
    checkedInAt: row.checked_in_at,
  };
}

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const userId = data.session?.user.id;
  if (!userId) {
    throw new Error("Not signed in.");
  }
  return userId;
}

// Filter by user explicitly: admins can read every ticket.
export async function listMyTickets(): Promise<TicketWithEvent[]> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getMyTicket(ticketId: string): Promise<TicketWithEvent | null> {
  const userId = await requireUserId();
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
