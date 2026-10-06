"use client";

import { useCallback, useEffect, useState } from "react";
import { listUpcomingEvents } from "@/features/events/model/events.repository";
import type { EventSummary } from "@/features/events/model/events.types";
import { useBookTicket } from "@/features/tickets/viewmodel/useBookTicket";

type EventsViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  upcomingEvents: EventSummary[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

type EventsState = {
  upcomingEvents: EventSummary[];
};

async function loadEvents(): Promise<EventsState> {
  return { upcomingEvents: await listUpcomingEvents() };
}

export function useEventsViewModel(): EventsViewModel {
  const [state, setState] = useState<EventsState>({ upcomingEvents: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState(await loadEvents());
  }, []);

  const { bookingEventId, bookingNotice, onBookTicket } = useBookTicket(reload);

  useEffect(() => {
    let isMounted = true;

    loadEvents()
      .then((data) => {
        if (isMounted) setState(data);
      })
      .catch(() => {
        if (isMounted) setError("Unable to load events.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    isLoading,
    error,
    notice: bookingNotice,
    upcomingEvents: state.upcomingEvents,
    bookingEventId,
    onBookTicket,
  };
}
