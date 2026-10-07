"use client";

import { useMemo, useState } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { listMyTickets } from "@/features/tickets/model/tickets.repository";

export type TicketTab = "upcoming" | "past";

export function useMyTickets() {
  const tickets = useAsyncData(listMyTickets, "my-tickets");
  const [tab, setTab] = useState<TicketTab>("upcoming");

  const { upcoming, past } = useMemo(() => {
    const all = tickets.data ?? [];
    const soonestFirst = (a: string | undefined, b: string | undefined) => (a ?? "").localeCompare(b ?? "");
    return {
      upcoming: all
        .filter((ticket) => ticket.phase === "upcoming")
        .sort((a, b) => soonestFirst(a.event?.startsAt, b.event?.startsAt)),
      past: all
        .filter((ticket) => ticket.phase !== "upcoming")
        .sort((a, b) => soonestFirst(b.event?.startsAt, a.event?.startsAt)),
    };
  }, [tickets.data]);

  return { tickets, tab, setTab, upcoming, past };
}
