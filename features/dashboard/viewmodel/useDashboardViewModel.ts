"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDashboardSnapshot } from "@/features/dashboard/model/dashboard.repository";
import {
  getCurrentUserProfile,
  hasActiveSession,
} from "@/features/auth/model/session.repository";
import { bookTicket } from "@/features/tickets/model/tickets.repository";
import type {
  DashboardSnapshot,
  DashboardStat,
  NextEvent,
  RecentTicket,
  SidebarItem,
  UpcomingEvent,
} from "@/features/dashboard/model/dashboard.types";

type DashboardViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  appName: string;
  userName: string;
  userAvatar: string;
  notifications: number;
  sidebarItems: SidebarItem[];
  lastUpdated: string;
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: RecentTicket[];
  upcomingEvents: UpcomingEvent[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  appName: "E-Ticket",
  userName: "",
  userAvatar: "",
  notifications: 0,
  sidebarItems: [],
  updatedAt: "",
  stats: [],
  nextEvent: null,
  recentTickets: [],
  upcomingEvents: [],
};

async function loadSnapshot(): Promise<DashboardSnapshot> {
  const [data, profile] = await Promise.all([
    fetchDashboardSnapshot(),
    getCurrentUserProfile(),
  ]);

  return {
    ...data,
    userName: profile?.displayName || data.userName,
    userAvatar: profile?.avatarUrl || data.userAvatar,
  };
}

export function useDashboardViewModel(): DashboardViewModel {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingEventId, setBookingEventId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const isAuthenticated = await hasActiveSession();
        if (!isAuthenticated) {
          router.replace("/login");
          return;
        }

        const data = await loadSnapshot();

        if (isMounted) {
          setSnapshot(data);
          setError(null);
          setIsLoading(false);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load dashboard data.");
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const onBookTicket = useCallback(
    async (eventId: string) => {
      if (bookingEventId) return;

      setBookingEventId(eventId);
      setNotice(null);

      try {
        const result = await bookTicket(eventId);
        if (!result.ok) {
          setNotice(result.errorMessage ?? "Booking failed. Please try again.");
          return;
        }

        setSnapshot(await loadSnapshot());
        setNotice("Ticket booked. You can find it under Recent Tickets.");
      } catch {
        setNotice("Booking failed. Please try again.");
      } finally {
        setBookingEventId(null);
      }
    },
    [bookingEventId]
  );

  const lastUpdated = useMemo(() => {
    if (!snapshot.updatedAt) return "";
    return new Date(snapshot.updatedAt).toLocaleString();
  }, [snapshot.updatedAt]);

  return {
    isLoading,
    error,
    notice,
    appName: snapshot.appName,
    userName: snapshot.userName,
    userAvatar: snapshot.userAvatar,
    notifications: snapshot.notifications,
    sidebarItems: snapshot.sidebarItems,
    lastUpdated,
    stats: snapshot.stats,
    nextEvent: snapshot.nextEvent,
    recentTickets: snapshot.recentTickets,
    upcomingEvents: snapshot.upcomingEvents,
    bookingEventId,
    onBookTicket,
  };
}
