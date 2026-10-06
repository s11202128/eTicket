"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentUserId } from "@/features/auth/model/session.repository";
import {
  listEventsCreatedBy,
  listUpcomingEvents,
} from "@/features/events/model/events.repository";
import type { EventDetails, EventSummary } from "@/features/events/model/events.types";
import { useBookTicket } from "@/features/tickets/viewmodel/useBookTicket";

type EventsViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  upcomingEvents: EventSummary[];
  myEvents: EventDetails[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

type EventsState = {
  upcomingEvents: EventSummary[];
  myEvents: EventDetails[];
};

async function loadEvents(): Promise<EventsState> {
  const userId = await getCurrentUserId();
  const [upcomingEvents, myEvents] = await Promise.all([
    listUpcomingEvents(),
    userId ? listEventsCreatedBy(userId) : Promise.resolve([]),
  ]);

  return { upcomingEvents, myEvents };
}

export function useEventsViewModel(): EventsViewModel {
  const [state, setState] = useState<EventsState>({ upcomingEvents: [], myEvents: [] });
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
    myEvents: state.myEvents,
    bookingEventId,
    onBookTicket,
  };
}
