"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUserId } from "@/features/auth/model/session.repository";
import { deleteEvent, getEventDetails } from "@/features/events/model/events.repository";
import type { EventDetails } from "@/features/events/model/events.types";
import { listMyTickets, toTicketSummary } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { useBookTicket } from "@/features/tickets/viewmodel/useBookTicket";

type EventDetailsViewModel = {
  isLoading: boolean;
  error: string | null;
  event: EventDetails | null;
  isOwner: boolean;
  myTicket: TicketSummary | null;
  notice: string | null;
  isBooking: boolean;
  isDeleting: boolean;
  onBook: () => Promise<void>;
  onDelete: () => Promise<void>;
};

type EventDetailsState = {
  event: EventDetails | null;
  isOwner: boolean;
  myTicket: TicketSummary | null;
};

async function loadEventDetails(eventId: string): Promise<EventDetailsState> {
  const [event, userId, tickets] = await Promise.all([
    getEventDetails(eventId),
    getCurrentUserId(),
    listMyTickets(),
  ]);

  const activeTicket = tickets.find(
    (ticket) => ticket.event_id === eventId && ticket.status === "active"
  );

  return {
    event,
    isOwner: Boolean(event && userId && event.createdBy === userId),
    myTicket: activeTicket ? toTicketSummary(activeTicket) : null,
  };
}

export function useEventDetailsViewModel(eventId: string): EventDetailsViewModel {
  const router = useRouter();
  const [state, setState] = useState<EventDetailsState>({
    event: null,
    isOwner: false,
    myTicket: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const onBook = () => onBookTicket(eventId);

  const onDelete = async () => {
    if (isDeleting) return;
    const confirmed = window.confirm(
      "Delete this event? All tickets booked for it will be removed too."
    );
    if (!confirmed) return;

    setIsDeleting(true);
    setDeleteError(null);

    try {
      const result = await deleteEvent(eventId);
      if (!result.ok) {
        setDeleteError(result.errorMessage ?? "Could not delete the event.");
        return;
      }
      router.push("/events");
    } catch {
      setDeleteError("Could not delete the event.");
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    isLoading,
    error,
    event: state.event,
    isOwner: state.isOwner,
    myTicket: state.myTicket,
    notice: deleteError ?? bookingNotice,
    isBooking: bookingEventId === eventId,
    isDeleting,
    onBook,
    onDelete,
  };
}
