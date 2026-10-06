"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession, signOut } from "@/features/auth/model/session.repository";
import {
  getCurrentUserProfile,
  hasActiveSession,
} from "@/features/auth/model/session.repository";
import { bookTicket } from "@/features/tickets/model/tickets.repository";
import type {
  DashboardSnapshot,
  DashboardStat,
  DashboardViewName,
  Event,
  SidebarItem,
  Ticket,
  UserProfile,
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
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({
    profile: EMPTY_PROFILE,
    events: [],
    tickets: [],
    updatedAt: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [bookingEventId, setBookingEventId] = useState<string | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const sidebarItems: SidebarItem[] = [
    { id: "dashboard", label: "Overview", href: "/dashboard", icon: "dashboard" },
    { id: "events", label: "Discover events", href: "/events", icon: "event" },
    { id: "tickets", label: "My tickets", href: "/tickets", icon: "ticket" },
    { id: "profile", label: "Profile", href: "/profile", icon: "profile" },
    ...(snapshot.profile.role === "admin"
      ? [{ id: "admin" as const, label: "System manager", href: "/admin", icon: "admin" as const }]
      : []),
    { id: "logout", label: "Sign out", href: "/login", icon: "logout" },
  ];

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

  const onProfileSave = async (displayName: string, phone: string) => {
    setActionId("profile");
    setError(null);
    setNotice(null);
    try {
      await updateProfile({ displayName, phone });
      setSnapshot((current) => ({
        ...current,
        profile: { ...current.profile, displayName, phone },
      }));
      setNotice("Profile updated successfully.");
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : "Unable to save your profile.");
    } finally {
      setActionId(null);
    }
  };

  const onLogout = async () => {
    await signOut();
    router.replace("/login");
    router.refresh();
  };

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
    activeView,
    profile: snapshot.profile,
    events: snapshot.events,
    tickets: snapshot.tickets,
    nextTicket,
    sidebarItems,
    stats,
    updatedAt: snapshot.updatedAt,
    isLoading,
    actionId,
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
