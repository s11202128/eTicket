import { supabase } from "@/lib/supabase";
import type { TicketResult, TicketWithEvent } from "@/features/tickets/model/tickets.types";

export async function bookTicket(eventId: string): Promise<TicketResult> {
  // user_id defaults to auth.uid() in the database.
  const { error } = await supabase.from("tickets").insert({ event_id: eventId });

  if (error) {
    return {
      ok: false,
      errorMessage: error.message,
    };
  }

  return { ok: true };
}

// Row-level security limits this to the signed-in user's tickets.
export async function listMyTickets(): Promise<TicketWithEvent[]> {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(title, starts_at, location)")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
