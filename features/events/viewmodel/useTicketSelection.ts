"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { bookTicketType } from "@/features/tickets/model/tickets.repository";
import { defaultTypeId, maxQuantity, type PublicTicketType } from "@/features/events/model/ticketAvailability";

type Options = {
  types: PublicTicketType[];
  perPerson: number;
  slug: string;
  isSignedIn: boolean;
};

// Choose a ticket type and quantity, then book. Signed-out visitors go to
// login and come back to this event.
export function useTicketSelection({ types, perPerson, slug, isSignedIn }: Options) {
  const router = useRouter();
  const toast = useToast();
  // One clock per render pass is plenty for sales windows.
  const now = useMemo(() => new Date(), []);
  const [selectedId, setSelectedId] = useState<string | null>(() => defaultTypeId(types, now));
  const [quantity, setQuantity] = useState(1);
  const [isBooking, setIsBooking] = useState(false);

  const selected = types.find((type) => type.id === selectedId) ?? null;
  const max = selected ? maxQuantity(selected, perPerson, now) : 0;
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
    if (!selected || max === 0 || isBooking) return;

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
      // Re-render the server page so seats left update.
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
    isBooking,
    book,
  };
}
