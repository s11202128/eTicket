import { supabase } from "@/lib/supabase";
import type { TicketDbStatus } from "@/lib/database.types";
import { ilikePattern, pageRange, sanitizeSearch } from "@/lib/search";
import type { ActionResult, BookingFilters, BookingRow, Paged } from "@/features/admin/model/admin.types";

const BOOKING_SELECT =
  "id, code, status, created_at, checked_in_at, events!inner(id, title, starts_at), profiles!inner(full_name, email)";

export const EXPORT_LIMIT = 5000;

type BookingRecord = {
  id: string;
  code: string;
  status: string;
  created_at: string;
  checked_in_at: string | null;
  events: { id: string; title: string; starts_at: string };
  profiles: { full_name: string | null; email: string | null };
};

function toRow(record: BookingRecord): BookingRow {
  return {
    id: record.id,
    code: record.code,
    status: record.status as TicketDbStatus,
    createdAt: record.created_at,
    checkedInAt: record.checked_in_at,
    eventId: record.events.id,
    eventTitle: record.events.title,
    eventStartsAt: record.events.starts_at,
    holderName: record.profiles.full_name,
    holderEmail: record.profiles.email,
  };
}

// Search matches the ticket code, or the holder's name or email.
async function matchingUserIds(search: string): Promise<string[]> {
  const pattern = ilikePattern(search);
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .or(`email.ilike."${pattern}",full_name.ilike."${pattern}"`)
    .limit(200);
  if (error) throw new Error(error.message);
  return data.map((profile) => profile.id);
}

async function buildQuery(filters: Omit<BookingFilters, "page">, range: [number, number]) {
  let query = supabase
    .from("tickets")
    .select(BOOKING_SELECT, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(range[0], range[1]);

  if (filters.status !== "all") query = query.eq("status", filters.status);
  if (filters.eventId !== "all") query = query.eq("event_id", filters.eventId);

  const search = sanitizeSearch(filters.search);
  if (search) {
    const userIds = await matchingUserIds(search);
    const codeFilter = `code.ilike."${ilikePattern(search.toUpperCase())}"`;
    query = userIds.length > 0
      ? query.or(`${codeFilter},user_id.in.(${userIds.join(",")})`)
      : query.or(codeFilter);
  }

  return query;
}

export async function listBookings(filters: BookingFilters, pageSize = 20): Promise<Paged<BookingRow>> {
  const query = await buildQuery(filters, pageRange(filters.page, pageSize));
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data as unknown as BookingRecord[]).map(toRow), total: count ?? 0 };
}

// Every booking matching the filters, up to EXPORT_LIMIT rows.
export async function listBookingsForExport(filters: Omit<BookingFilters, "page">): Promise<BookingRow[]> {
  const query = await buildQuery(filters, [0, EXPORT_LIMIT - 1]);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as unknown as BookingRecord[]).map(toRow);
}

export async function adminCancelBooking(ticketId: string): Promise<ActionResult> {
  const { error } = await supabase.rpc("admin_cancel_ticket", { p_ticket_id: ticketId });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, data: undefined };
}
