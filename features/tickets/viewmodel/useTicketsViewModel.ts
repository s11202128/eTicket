"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { listMyTickets, toTicketSummary } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { useCancelTicket } from "@/features/tickets/viewmodel/useCancelTicket";

type TicketsViewModel = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  activeTickets: TicketSummary[];
  pastTickets: TicketSummary[];
  cancellingTicketId: string | null;
  onCancelTicket: (ticketId: string) => Promise<void>;
};

async function loadTickets(): Promise<TicketSummary[]> {
  const now = new Date();
  const rows = await listMyTickets();
  return rows.map((ticket) => toTicketSummary(ticket, now));
}

export function useTicketsViewModel(): TicketsViewModel {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setTickets(await loadTickets());
  }, []);

  const { cancellingTicketId, cancelNotice, onCancelTicket } = useCancelTicket(reload);

  useEffect(() => {
    let isMounted = true;

    loadTickets()
      .then((data) => {
        if (isMounted) setTickets(data);
      })
      .catch(() => {
        if (isMounted) setError("Unable to load your tickets.");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status === "Active"),
    [tickets]
  );
  const pastTickets = useMemo(
    () => tickets.filter((ticket) => ticket.status !== "Active"),
    [tickets]
  );

  return {
    isLoading,
    error,
    notice: cancelNotice,
    activeTickets,
    pastTickets,
    cancellingTicketId,
    onCancelTicket,
  };
}
