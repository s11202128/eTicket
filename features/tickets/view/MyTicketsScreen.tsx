"use client";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import type { TicketView } from "@/features/tickets/model/tickets.types";
import { TicketStub } from "@/features/tickets/view/TicketStub";
import { useMyTickets, type TicketTab } from "@/features/tickets/viewmodel/useMyTickets";

function TicketList({ tickets }: { tickets: TicketView[] }) {
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {tickets.map((ticket) => (
        <li key={ticket.id} className="grid focus-within:rounded-xl focus-within:ring-2 focus-within:ring-ring">
          <TicketStub ticket={ticket} />
        </li>
      ))}
    </ul>
  );
}

export default function MyTicketsScreen() {
  const { tickets, tab, setTab, upcoming, past } = useMyTickets();
  const list = tab === "upcoming" ? upcoming : past;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">My tickets</h1>

      <Tabs<TicketTab>
        label="Ticket groups"
        idPrefix="tickets"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "upcoming", label: "Upcoming", count: tickets.data ? upcoming.length : undefined },
          { id: "past", label: "Past", count: tickets.data ? past.length : undefined },
        ]}
      />

      <section id={`tickets-panel-${tab}`} role="tabpanel" aria-labelledby={`tickets-tab-${tab}`} tabIndex={0}>
        {tickets.error ? (
          <div role="alert" className="grid justify-items-start gap-3 rounded-lg border border-danger/40 bg-danger-bg p-5 text-danger">
            <p className="font-semibold">Couldn&apos;t load your tickets.</p>
            <Button variant="secondary" size="sm" onClick={() => void tickets.reload()}>
              Try again
            </Button>
          </div>
        ) : tickets.isLoading && !tickets.data ? (
          <div role="status" aria-label="Loading tickets" className="grid gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : list.length === 0 ? (
          tab === "upcoming" ? (
            <EmptyState
              icon="🎟"
              title="No upcoming tickets"
              description="When you book an event, your ticket shows up here."
              action={<ButtonLink href="/events">Find an event</ButtonLink>}
            />
          ) : (
            <EmptyState icon="🗂" title="No past tickets" description="Used, cancelled and expired tickets appear here." />
          )
        ) : (
          <TicketList tickets={list} />
        )}
      </section>
    </div>
  );
}
