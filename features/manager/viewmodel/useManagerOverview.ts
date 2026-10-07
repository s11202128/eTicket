"use client";

import { useAsyncData } from "@/lib/useAsyncData";
import { eventHasEnded } from "@/features/manager/model/eventTabs";
import { localDayKey } from "@/features/manager/model/salesSeries";
import { listMyEvents, type EventMeta } from "@/features/manager/model/managerEvents.repository";
import { listRecentBookings, listTicketActivity, type RecentBooking } from "@/features/manager/model/manager.repository";

export type ManagerOverview = {
  ticketsSold: number;
  upcomingCount: number;
  checkInsToday: number;
  awaitingApproval: number;
  nextEvents: EventMeta[];
  recentBookings: RecentBooking[];
  hasEvents: boolean;
};

async function loadOverview(): Promise<ManagerOverview> {
  const events = await listMyEvents();
  const [activity, recentBookings] = await Promise.all([
    listTicketActivity(events.map((event) => event.id)),
    listRecentBookings(8),
  ]);

  const now = new Date();
  const today = localDayKey(now);
  const upcoming = events.filter((event) => event.status === "published" && !eventHasEnded(event, now));

  return {
    ticketsSold: activity.filter((ticket) => ticket.status !== "cancelled").length,
    upcomingCount: upcoming.length,
    checkInsToday: activity.filter((ticket) => ticket.checkedInAt && localDayKey(new Date(ticket.checkedInAt)) === today).length,
    awaitingApproval: events.filter((event) => event.status === "pending_review").length,
    nextEvents: upcoming.slice(0, 5),
    recentBookings,
    hasEvents: events.length > 0,
  };
}

export function useManagerOverview() {
  return useAsyncData(loadOverview, "overview");
}
