import { supabase } from "@/lib/supabase";
import type { EventStatus, TicketDbStatus } from "@/lib/database.types";
import type { ActionResult } from "@/features/manager/model/managerEvents.repository";

// Attendees, door staff, check-in progress and dashboard data for organizers.

export type Attendee = {
  ticketId: string;
  code: string;
  status: TicketDbStatus;
  bookedAt: string;
  checkedInAt: string | null;
  ticketTypeId: string;
  ticketTypeName: string;
  holderName: string | null;
  holderEmail: string | null;
};

export async function listAttendees(eventId: string): Promise<Attendee[]> {
  const { data, error } = await supabase.rpc("list_event_attendees", { p_event_id: eventId });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    ticketId: row.ticket_id,
    code: row.code,
    status: row.status as TicketDbStatus,
    bookedAt: row.booked_at,
    checkedInAt: row.checked_in_at,
    ticketTypeId: row.ticket_type_id,
    ticketTypeName: row.ticket_type_name,
    holderName: row.holder_name,
    holderEmail: row.holder_email,
  }));
}

// ---------------------------------------------------------------------------
// Door staff
// ---------------------------------------------------------------------------
export type StaffMember = { userId: string; name: string | null; email: string | null; addedAt: string };

export async function listStaff(eventId: string): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc("list_event_staff", { p_event_id: eventId });
  if (error) throw new Error(error.message);
  return data.map((row) => ({ userId: row.user_id, name: row.full_name, email: row.email, addedAt: row.added_at }));
}

export type AddStaffResult = { ok: true; outcome: "added" | "already_staff" | "no_account" } | { ok: false; errorMessage: string };

export async function addStaff(eventId: string, email: string): Promise<AddStaffResult> {
  const { data, error } = await supabase.rpc("add_event_staff", { p_event_id: eventId, p_email: email.trim() });
  if (error) return { ok: false, errorMessage: error.message };
  return { ok: true, outcome: data as "added" | "already_staff" | "no_account" };
}

export async function removeStaff(eventId: string, userId: string): Promise<ActionResult> {
  const { data, error } = await supabase
    .from("event_staff")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .select("user_id");
  if (error) return { ok: false, errorMessage: error.message };
  if (data.length === 0) return { ok: false, errorMessage: "Couldn't remove this person." };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Check-in
// ---------------------------------------------------------------------------
export type CheckInEvent = { id: string; title: string; startsAt: string; status: EventStatus };

// Events this person can scan for: their own, ones they're door staff on, or
// (admins) everything live. Only events from the last two days onwards.
export async function listCheckInEvents(): Promise<CheckInEvent[]> {
  const { data: session } = await supabase.auth.getSession();
  const userId = session.session?.user.id;
  if (!userId) throw new Error("Please sign in.");

  const [{ data: staffRows, error: staffError }, { data: profile }] = await Promise.all([
    supabase.from("event_staff").select("event_id").eq("user_id", userId),
    supabase.from("profiles").select("role").eq("id", userId).maybeSingle(),
  ]);
  if (staffError) throw new Error(staffError.message);

  const since = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  let query = supabase
    .from("events")
    .select("id, title, starts_at, status")
    .in("status", ["published", "completed"])
    .gte("starts_at", since)
    .order("starts_at", { ascending: true })
    .limit(100);

  if (profile?.role !== "admin") {
    const staffIds = (staffRows ?? []).map((row) => row.event_id);
    query = query.or([`organizer_id.eq.${userId}`, ...(staffIds.length ? [`id.in.(${staffIds.join(",")})`] : [])].join(","));
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data.map((row) => ({ id: row.id, title: row.title, startsAt: row.starts_at, status: row.status as EventStatus }));
}

export type CheckInProgress = { checkedIn: number; total: number };

export async function getCheckInProgress(eventId: string): Promise<CheckInProgress> {
  const { data, error } = await supabase.rpc("get_check_in_progress", { p_event_id: eventId });
  if (error) throw new Error(error.message);
  return { checkedIn: data[0]?.checked_in ?? 0, total: data[0]?.total ?? 0 };
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------
export type TicketActivity = { eventId: string; status: TicketDbStatus; bookedAt: string; checkedInAt: string | null };

// Ticket rows for the organizer's events (no personal details).
export async function listTicketActivity(eventIds: string[]): Promise<TicketActivity[]> {
  if (eventIds.length === 0) return [];
  const { data, error } = await supabase
    .from("tickets")
    .select("event_id, status, created_at, checked_in_at")
    .in("event_id", eventIds)
    .limit(10000);
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    eventId: row.event_id,
    status: row.status as TicketDbStatus,
    bookedAt: row.created_at,
    checkedInAt: row.checked_in_at,
  }));
}

export type RecentBooking = {
  ticketId: string;
  eventId: string;
  eventTitle: string;
  ticketTypeName: string;
  holderName: string | null;
  status: TicketDbStatus;
  bookedAt: string;
};

export async function listRecentBookings(limit = 8): Promise<RecentBooking[]> {
  const { data, error } = await supabase.rpc("list_my_recent_bookings", { p_limit: limit });
  if (error) throw new Error(error.message);
  return data.map((row) => ({
    ticketId: row.ticket_id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    ticketTypeName: row.ticket_type_name,
    holderName: row.holder_name,
    status: row.status as TicketDbStatus,
    bookedAt: row.booked_at,
  }));
}
