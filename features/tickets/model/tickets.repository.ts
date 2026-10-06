import { supabase } from "@/lib/supabase";
import { formatDate, formatDateTime } from "@/lib/format";
import type {
  RedeemResult,
  TicketResult,
  TicketStatus,
  TicketSummary,
  TicketWithEvent,
} from "@/features/tickets/model/tickets.types";

const TICKET_SELECT = "*, events(id, title, starts_at, location)";
const UNIQUE_VIOLATION = "23505";

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
  // user_id defaults to auth.uid(); a database trigger rejects bookings for
  // past or sold-out events.
  const { error } = await supabase.from("tickets").insert({ event_id: eventId });

  if (error) {
    return {
      ok: false,
      errorMessage:
        error.code === UNIQUE_VIOLATION
          ? "You already have a ticket for this event."
          : error.message,
    };
  }

  return { ok: true };
}

export async function cancelTicket(ticketId: string): Promise<TicketResult> {
  const { data, error } = await supabase
    .from("tickets")
    .update({ status: "cancelled" })
    .eq("id", ticketId)
    .select("id");

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  if (data.length === 0) {
    return { ok: false, errorMessage: "Only your own active tickets can be cancelled." };
  }

  return { ok: true };
}

export async function redeemTicket(code: string): Promise<RedeemResult> {
  const { data, error } = await supabase.rpc("redeem_ticket", { ticket_code: code });

  if (error) {
    return { ok: false, errorMessage: error.message };
  }

  const [row] = data;
  return {
    ok: true,
    eventTitle: row?.event_title,
    holderEmail: row?.holder_email,
  };
}

// Row-level security limits these to the signed-in user's tickets.
export async function listMyTickets(): Promise<TicketWithEvent[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getMyTicket(ticketId: string): Promise<TicketWithEvent | null> {
  const { data, error } = await supabase
    .from("tickets")
    .select(TICKET_SELECT)
    .eq("id", ticketId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
