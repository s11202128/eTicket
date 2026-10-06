"use client";

import { useCallback, useEffect, useState } from "react";
import { getCurrentRole } from "@/features/auth/model/session.repository";
import { getEventDetails } from "@/features/events/model/events.repository";
import type { EventDetails } from "@/features/events/model/events.types";
import { listMyTickets, toTicketSummary } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { useBookTicket } from "@/features/tickets/viewmodel/useBookTicket";

type EventDetailsViewModel = {
  isLoading: boolean;
  error: string | null;
  event: EventDetails | null;
  isAdmin: boolean;
  myTicket: TicketSummary | null;
  notice: string | null;
  isBooking: boolean;
  onBook: () => Promise<void>;
};

type EventDetailsState = {
  event: EventDetails | null;
  isAdmin: boolean;
  myTicket: TicketSummary | null;
};

async function loadEventDetails(eventId: string): Promise<EventDetailsState> {
  const [event, role, tickets] = await Promise.all([
    getEventDetails(eventId),
    getCurrentRole(),
    listMyTickets(),
  ]);

  const activeTicket = tickets.find(
    (ticket) => ticket.event_id === eventId && ticket.status === "active"
  );

  return {
    event,
    isAdmin: role === "admin",
    myTicket: activeTicket ? toTicketSummary(activeTicket) : null,
  };
}

export function useEventDetailsViewModel(eventId: string): EventDetailsViewModel {
  const [state, setState] = useState<EventDetailsState>({
    event: null,
    isAdmin: false,
    myTicket: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setState(await loadEventDetails(eventId));
  }, [eventId]);

  const { bookingEventId, bookingNotice, onBookTicket } = useBookTicket(reload);

  useEffect(() => {
    let isMounted = true;

    loadEventDetails(eventId)
      .then((data) => {
        if (!isMounted) return;
        setState(data);
        if (!data.event) setError("Event not found.");
      })
      .catch(() => {
        if (isMounted) setError("Unable to load this event.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [eventId]);

  return {
    isLoading,
    error,
    event: state.event,
    isAdmin: state.isAdmin,
    myTicket: state.myTicket,
    notice: bookingNotice,
    isBooking: bookingEventId === eventId,
    onBook: () => onBookTicket(eventId),
  };
}
