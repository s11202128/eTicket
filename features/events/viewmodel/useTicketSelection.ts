"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { bookTicketType, countMyTicketsForEvent } from "@/features/tickets/model/tickets.repository";
import { useViewer } from "@/features/auth/viewmodel/useViewer";
import { defaultTypeId, maxQuantity, type PublicTicketType } from "@/features/events/model/ticketAvailability";

type Options = {
  types: PublicTicketType[];
  perPerson: number;
  eventId: string;
  slug: string;
  // Organizer/admin preview: no viewer lookups.
  preview: boolean;
};

// Choose a ticket type and quantity, then book. Signed-out visitors go to
// login and come back to this event. The page is cached for everyone, so who
// is signed in and how many tickets they hold are looked up in the browser.
export function useTicketSelection({ types, perPerson, eventId, slug, preview }: Options) {
  const router = useRouter();
  const toast = useToast();
  const viewerState = useViewer();
  const viewerId = !preview && viewerState.status === "signed_in" ? viewerState.viewer.id : null;
  const isSignedIn = viewerId !== null;
  // Known once the viewer (and, when signed in, their ticket count) has loaded.
  const [booked, setBooked] = useState<{ userId: string; count: number } | null>(null);
  const alreadyBooked = booked && booked.userId === viewerId ? booked.count : 0;
  const viewerReady =
    preview || viewerState.status === "signed_out" || (viewerId !== null && booked?.userId === viewerId);

  // Bumped after a booking to count again.
  const [countVersion, setCountVersion] = useState(0);

  useEffect(() => {
    if (!viewerId) return;
    let active = true;
    countMyTicketsForEvent(eventId, viewerId).then(
      (count) => {
        if (active) setBooked({ userId: viewerId, count });
      },
      () => {
        // Unknown: let them try; book_ticket enforces the limit and says so.
        if (active) setBooked({ userId: viewerId, count: 0 });
      }
    );
    return () => {
      active = false;
    };
  }, [eventId, viewerId, countVersion]);
  // One clock per render pass is plenty for sales windows.
  const now = useMemo(() => new Date(), []);
  // book_ticket counts tickets already held toward the per-person limit.
  const remaining = Math.max(perPerson - alreadyBooked, 0);
  const [selectedId, setSelectedId] = useState<string | null>(() => defaultTypeId(types, now));
  const [quantity, setQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  const selected = types.find((type) => type.id === selectedId) ?? null;
  const max = selected ? maxQuantity(selected, remaining, now) : 0;
  const safeQuantity = Math.min(Math.max(quantity, 1), Math.max(max, 1));

  const select = (id: string) => {
    const type = types.find((item) => item.id === id);
    if (!type || maxQuantity(type, perPerson, now) === 0) return;
    setSelectedId(id);
    setQuantity(1);
  };

  const book = async () => {
    if (!isSignedIn) {
      router.push(`/login?next=${encodeURIComponent(`/events/${slug}`)}`);
      return;
    }
    if (isBooking) return;
    if (!selected) {
      toast.error("Choose a ticket type first.");
      return;
    }
    if (remaining === 0) {
      toast.error(`You already have ${alreadyBooked} ticket(s) for this event, the most allowed per person.`);
      return;
    }
    if (max === 0) {
      toast.error(`${selected.name} isn't available right now.`);
      return;
    }

    setIsBooking(true);
    try {
      const result = await bookTicketType(selected.id, safeQuantity);
      if (!result.ok || !result.code) {
        toast.error(result.errorMessage ?? "Booking failed. Please try again.");
        return;
      }
      toast.success(
        safeQuantity === 1 ? "You're in! Your ticket is ready." : `You're in! Your ${safeQuantity} tickets are ready.`,
        safeQuantity === 1 ? { label: "View ticket", href: `/tickets/${result.code}` } : { label: "My tickets", href: "/tickets" }
      );
      setQuantity(1);
      setCountVersion((value) => value + 1);
      // Re-render the page so seats left update (cached pages catch up within a minute).
      router.refresh();
    } catch {
      toast.error("Booking failed. Check your connection and try again.");
    } finally {
      setIsBooking(false);
    }
  };

  return {
    now,
    selectedId,
    select,
    selected,
    quantity: safeQuantity,
    max,
    increment: () => setQuantity(Math.min(safeQuantity + 1, max)),
    decrement: () => setQuantity(Math.max(safeQuantity - 1, 1)),
    total: selected ? selected.price * safeQuantity : 0,
    remaining,
    isSignedIn,
    alreadyBooked,
    viewerReady,
    isBooking,
    book,
  };
}
