"use client";

import { useState } from "react";
import { cancelTicket } from "@/features/tickets/model/tickets.repository";

type CancelTicketViewModel = {
  cancellingTicketId: string | null;
  cancelNotice: string | null;
  onCancelTicket: (ticketId: string) => Promise<void>;
};

// Shared cancel flow; `onCancelled` lets the page reload its data afterwards.
export function useCancelTicket(onCancelled: () => Promise<void>): CancelTicketViewModel {
  const [cancellingTicketId, setCancellingTicketId] = useState<string | null>(null);
  const [cancelNotice, setCancelNotice] = useState<string | null>(null);

  const onCancelTicket = async (ticketId: string) => {
    if (cancellingTicketId) return;
    if (!window.confirm("Cancel this ticket? This can't be undone.")) return;

    setCancellingTicketId(ticketId);
    setCancelNotice(null);

    try {
      const result = await cancelTicket(ticketId);
      if (!result.ok) {
        setCancelNotice(result.errorMessage ?? "Could not cancel the ticket.");
        return;
      }

      await onCancelled();
      setCancelNotice("Ticket cancelled.");
    } catch {
      setCancelNotice("Could not cancel the ticket.");
    } finally {
      setCancellingTicketId(null);
    }
  };

  return { cancellingTicketId, cancelNotice, onCancelTicket };
}
