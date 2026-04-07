"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDashboardSnapshot } from "@/features/dashboard/model/dashboard.repository";
import {
  getCurrentUserProfile,
  hasActiveSession,
} from "@/features/auth/model/session.repository";
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
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  appName: "E-Ticket",
  userName: "",
  userAvatar: "",
  notifications: 0,
  sidebarItems: [],
  updatedAt: "",
  stats: [],
  nextEvent: {
    title: "",
    dateTime: "",
    location: "",
    imageUrl: "",
    ctaLabel: "View Details",
  },
  recentTickets: [],
  upcomingEvents: [],
};

export function useDashboardViewModel(): DashboardViewModel {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const isAuthenticated = await hasActiveSession();
        if (!isAuthenticated) {
          router.replace("/login");
          return;
        }

        const data = await fetchDashboardSnapshot();
        const profile = await getCurrentUserProfile();

        if (isMounted) {
          setSnapshot({
            ...data,
            userName: profile?.displayName || data.userName,
            userAvatar: profile?.avatarUrl || data.userAvatar,
          });
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load dashboard data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const lastUpdated = useMemo(() => {
    if (!snapshot.updatedAt) return "";
    return new Date(snapshot.updatedAt).toLocaleString();
  }, [snapshot.updatedAt]);

  return {
    isLoading,
    error,
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
  };
}
