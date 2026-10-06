"use client";

import { Button } from "@/components/ui/Button";
import { useBookEvent } from "@/features/events/viewmodel/useBookEvent";

type BookButtonProps = {
  eventId: string;
  slug: string;
  isSignedIn: boolean;
  unavailableReason: string | null;
};

export function BookButton({ eventId, slug, isSignedIn, unavailableReason }: BookButtonProps) {
  const { isBooking, book } = useBookEvent({ eventId, slug, isSignedIn });

  if (unavailableReason) {
    return (
      <Button size="lg" disabled className="w-full">
        {unavailableReason}
      </Button>
    );
  }

  return (
    <Button size="lg" className="w-full" isLoading={isBooking} onClick={() => void book()}>
      {isSignedIn ? "Book ticket" : "Log in to book"}
    </Button>
  );
}
