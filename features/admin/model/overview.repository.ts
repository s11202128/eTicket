import { supabase } from "@/lib/supabase";
import { viewerTimeZone } from "@/lib/format";
import { listAdminEvents } from "@/features/admin/model/adminEvents.repository";
import { listBookings } from "@/features/admin/model/bookings.repository";
import type {
  AdminEventRow,
  AdminStats,
  BookingRow,
  NearCapacityEvent,
} from "@/features/admin/model/admin.types";

export type OverviewData = {
  stats: AdminStats;
  nearCapacity: NearCapacityEvent[];
  recentBookings: BookingRow[];
  upcomingEvents: AdminEventRow[];
};

async function fetchStats(): Promise<AdminStats> {
  const { data, error } = await supabase.rpc("admin_stats", { p_time_zone: viewerTimeZone() });
  if (error) throw new Error(error.message);
  const [row] = data;
  return {
    ticketsToday: row?.tickets_today ?? 0,
    ticketsThisWeek: row?.tickets_this_week ?? 0,
    upcomingEvents: row?.upcoming_events ?? 0,
    eventsNearCapacity: row?.events_near_capacity ?? 0,
    totalUsers: row?.total_users ?? 0,
  };
}

async function fetchNearCapacity(): Promise<NearCapacityEvent[]> {
  const { data, error } = await supabase.rpc("admin_events_near_capacity", { p_threshold: 0.8 });
  if (error) throw new Error(error.message);
  return data.slice(0, 5).map((row) => ({
    eventId: row.event_id,
    title: row.title,
    slug: row.slug,
    startsAt: row.starts_at,
    capacity: row.capacity,
    sold: row.sold,
  }));
}

async function fetchUpcoming(): Promise<AdminEventRow[]> {
  const today = new Date();
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const { rows } = await listAdminEvents(
    { search: "", status: "published", categoryId: "all", from: local, to: "", page: 1 },
    50
  );
  // listAdminEvents sorts newest first; the overview wants soonest first.
  return rows
    .filter((event) => new Date(event.startsAt) > today)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .slice(0, 5);
}

export async function fetchOverview(): Promise<OverviewData> {
  const [stats, nearCapacity, bookings, upcomingEvents] = await Promise.all([
    fetchStats(),
    fetchNearCapacity(),
    listBookings({ search: "", status: "all", eventId: "all", page: 1 }, 8),
    fetchUpcoming(),
  ]);
  return { stats, nearCapacity, recentBookings: bookings.rows, upcomingEvents };
}
