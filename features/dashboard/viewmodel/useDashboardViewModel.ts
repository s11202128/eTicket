"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hasActiveSession, signOut } from "@/features/auth/model/session.repository";
import {
  bookEvent,
  fetchDashboardSnapshot,
  updateProfile,
} from "@/features/dashboard/model/dashboard.repository";
import type {
  DashboardSnapshot,
  DashboardStat,
  DashboardViewName,
  Event,
  SidebarItem,
  Ticket,
  UserProfile,
} from "@/features/dashboard/model/dashboard.types";

const EMPTY_PROFILE: UserProfile = {
  displayName: "",
  email: "",
  phone: "",
  avatarUrl: null,
};

export function useDashboardViewModel(activeView: DashboardViewName) {
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

  const loadDashboard = useCallback(async () => {
    try {
      const authenticated = await hasActiveSession();
      if (!authenticated) {
        router.replace("/login");
        return;
      }
      setSnapshot(await fetchDashboardSnapshot());
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load your account.");
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const sidebarItems: SidebarItem[] = [
    { id: "dashboard", label: "Overview", href: "/dashboard", icon: "dashboard" },
    { id: "events", label: "Discover events", href: "/events", icon: "event" },
    { id: "tickets", label: "My tickets", href: "/tickets", icon: "ticket" },
    { id: "profile", label: "Profile", href: "/profile", icon: "profile" },
    { id: "logout", label: "Sign out", href: "/login", icon: "logout" },
  ];

  const stats = useMemo<DashboardStat[]>(() => {
    const activeTickets = snapshot.tickets.filter((ticket) => ticket.status === "active");
    return [
      {
        id: "active-tickets",
        title: "Active tickets",
        value: String(activeTickets.reduce((sum, ticket) => sum + ticket.quantity, 0)),
        subtitle: "Ready on your phone",
        icon: "ticket",
      },
      {
        id: "upcoming-events",
        title: "Events saved",
        value: String(new Set(activeTickets.map((ticket) => ticket.eventId)).size),
        subtitle: "On your calendar",
        icon: "event",
      },
      {
        id: "available",
        title: "Events to explore",
        value: String(snapshot.events.length),
        subtitle: "Curated for you",
        icon: "dashboard",
      },
    ];
  }, [snapshot.events.length, snapshot.tickets]);

  const onBook = async (event: Event, quantity = 1) => {
    setActionId(event.id);
    setError(null);
    setNotice(null);
    try {
      const ticket = await bookEvent(event.id, quantity);
      setSnapshot((current) => ({
        ...current,
        events: current.events.map((item) =>
          item.id === event.id
            ? { ...item, remainingTickets: Math.max(0, item.remainingTickets - quantity) }
            : item,
        ),
        tickets: [ticket, ...current.tickets],
      }));
      setNotice(`${quantity} ${quantity === 1 ? "ticket" : "tickets"} booked for ${event.title}.`);
    } catch (bookingError) {
      setError(bookingError instanceof Error ? bookingError.message : "Booking failed.");
    } finally {
      setActionId(null);
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

  const nextTicket: Ticket | null =
    snapshot.tickets
      .filter((ticket) => ticket.status === "active")
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())[0] ?? null;

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
    onBook,
    onProfileSave,
    onLogout,
  };
}
