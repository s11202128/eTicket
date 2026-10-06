"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchDashboardSnapshot } from "@/features/dashboard/model/dashboard.repository";
import { getCurrentUserProfile } from "@/features/auth/model/session.repository";
import { useBookTicket } from "@/features/tickets/viewmodel/useBookTicket";
import type {
  DashboardStat,
  NextEvent,
} from "@/features/dashboard/model/dashboard.types";
import type { EventSummary } from "@/features/events/model/events.types";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";

type DashboardViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  userName: string;
  lastUpdated: string;
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: TicketSummary[];
  upcomingEvents: EventSummary[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

type DashboardState = {
  userName: string;
  updatedAt: string;
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: TicketSummary[];
  upcomingEvents: EventSummary[];
};

const EMPTY_STATE: DashboardState = {
  userName: "",
  updatedAt: "",
  stats: [],
  nextEvent: null,
  recentTickets: [],
  upcomingEvents: [],
};

async function loadDashboard(): Promise<DashboardState> {
  const [data, profile] = await Promise.all([
    fetchDashboardSnapshot(),
    getCurrentUserProfile(),
  ]);

  return { ...data, userName: profile?.displayName ?? "" };
}

export function useDashboardViewModel(): DashboardViewModel {
  const [state, setState] = useState<DashboardState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState(await loadDashboard());
  }, []);

  const { bookingEventId, bookingNotice, onBookTicket } = useBookTicket(reload);

  useEffect(() => {
    let isMounted = true;

    loadDashboard()
      .then((data) => {
        if (!isMounted) return;
        setState(data);
        setError(null);
        setIsLoading(false);
      })
      .catch(() => {
        if (!isMounted) return;
        setError("Unable to load dashboard data.");
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const lastUpdated = useMemo(() => {
    if (!state.updatedAt) return "";
    return new Date(state.updatedAt).toLocaleString();
  }, [state.updatedAt]);

  return {
    isLoading,
    error,
    notice: bookingNotice,
    userName: state.userName,
    lastUpdated,
    stats: state.stats,
    nextEvent: state.nextEvent,
    recentTickets: state.recentTickets,
    upcomingEvents: state.upcomingEvents,
    bookingEventId,
    onBookTicket,
  };
}
