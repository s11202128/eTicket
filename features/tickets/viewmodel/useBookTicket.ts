"use client";

import { useCallback, useState } from "react";
import { bookTicket } from "@/features/tickets/model/tickets.repository";

type BookTicketViewModel = {
  bookingEventId: string | null;
  bookingNotice: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

// Shared booking flow; `onBooked` lets the page reload its data afterwards.
export function useBookTicket(onBooked: () => Promise<void>): BookTicketViewModel {
  const [bookingEventId, setBookingEventId] = useState<string | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);

  const onBookTicket = useCallback(
    async (eventId: string) => {
      if (bookingEventId) return;

      setBookingEventId(eventId);
      setBookingNotice(null);

      try {
        const result = await bookTicket(eventId);
        if (!result.ok) {
          setBookingNotice(result.errorMessage ?? "Booking failed. Please try again.");
          return;
        }

        await onBooked();
        setBookingNotice("Ticket booked. You can find it under My Tickets.");
      } catch {
        setBookingNotice("Booking failed. Please try again.");
      } finally {
        setBookingEventId(null);
      }
    },
    [bookingEventId, onBooked]
  );

  return { bookingEventId, bookingNotice, onBookTicket };
}
