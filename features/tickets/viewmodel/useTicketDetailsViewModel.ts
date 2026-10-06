"use client";

import { useCallback, useEffect, useState } from "react";
import { getMyTicket, toTicketSummary } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { useCancelTicket } from "@/features/tickets/viewmodel/useCancelTicket";

type TicketDetailsViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  ticket: TicketSummary | null;
  isCancelling: boolean;
  onCancel: () => Promise<void>;
};

async function loadTicket(ticketId: string): Promise<TicketSummary | null> {
  const ticket = await getMyTicket(ticketId);
  return ticket ? toTicketSummary(ticket) : null;
}

export function useTicketDetailsViewModel(ticketId: string): TicketDetailsViewModel {
  const [ticket, setTicket] = useState<TicketSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setTicket(await loadTicket(ticketId));
  }, [ticketId]);

  const { cancellingTicketId, cancelNotice, onCancelTicket } = useCancelTicket(reload);

  useEffect(() => {
    let isMounted = true;

    loadTicket(ticketId)
      .then((data) => {
        if (!isMounted) return;
        setTicket(data);
        if (!data) setError("Ticket not found.");
      })
      .catch(() => {
        if (isMounted) setError("Unable to load this ticket.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  return {
    isLoading,
    error,
    notice: cancelNotice,
    ticket,
    isCancelling: cancellingTicketId === ticketId,
    onCancel: () => onCancelTicket(ticketId),
  };
}
