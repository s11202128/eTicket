"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { bookTicket } from "@/features/tickets/model/tickets.repository";

// Booking requires sign-in; signed-out visitors go to login and come back
// to this event afterwards.
export function useBookEvent({ eventId, slug, isSignedIn }: { eventId: string; slug: string; isSignedIn: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [isBooking, setIsBooking] = useState(false);

  const book = async () => {
    if (!isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    if (isBooking) return;

    setIsBooking(true);
    try {
      const result = await bookTicket(eventId);
      if (!result.ok || !result.code) {
        toast.error(result.errorMessage ?? "Booking failed. Please try again.");
        return;
      }
      toast.success("You're in! Your ticket is ready.", { label: "View ticket", href: `/tickets/${result.code}` });
      // Re-render the server page so seats left update.
      router.refresh();
    } catch {
      toast.error("Booking failed. Check your connection and try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return { isBooking, book };
}
