import Link from "next/link";
import type { DashboardStat, NextEvent } from "@/features/dashboard/model/dashboard.types";
import type { EventSummary } from "@/features/events/model/events.types";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { WelcomeBanner } from "@/features/dashboard/view/components/dashboard/WelcomeBanner";
import { StatCard } from "@/features/dashboard/view/components/dashboard/StatCard";
import { NextEventCard } from "@/features/dashboard/view/components/dashboard/NextEventCard";
import { TicketCard } from "@/features/tickets/view/TicketCard";
import { EventCard } from "@/features/events/view/EventCard";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type DashboardViewProps = {
  userName: string;
  lastUpdated: string;
  stats: DashboardStat[];
  nextEvent: NextEvent | null;
  recentTickets: TicketSummary[];
  upcomingEvents: EventSummary[];
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

export function DashboardView({
  userName,
  lastUpdated,
  stats,
  nextEvent,
  recentTickets,
  upcomingEvents,
  isLoading,
  error,
  notice,
  bookingEventId,
  onBookTicket,
}: DashboardViewProps) {
  if (isLoading) {
    return <p className={styles.stateText}>Loading dashboard...</p>;
  }

  if (error) {
    return <p className={styles.stateText}>{error}</p>;
  }

  return (
    <>
      <WelcomeBanner userName={userName} updatedAt={lastUpdated} />

      {notice ? <p className={styles.subtle}>{notice}</p> : null}

      <section className={styles.statsGrid}>
        {stats.map((stat) => (
          <StatCard key={stat.id} stat={stat} />
        ))}
      </section>

      {nextEvent ? <NextEventCard event={nextEvent} /> : null}

      <section>
        <h2 className={styles.sectionTitle}>Recent Tickets</h2>
        <div className={styles.ticketGrid}>
          {recentTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {recentTickets.length === 0 ? (
            <p className={styles.subtle}>No tickets yet. Book one from Upcoming Events.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className={styles.sectionTitle}>Upcoming Events</h2>
        <div className={styles.eventGrid}>
          {upcomingEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isBooking={bookingEventId === event.id}
              onBook={onBookTicket}
            />
          ))}
          {upcomingEvents.length === 0 ? (
            <p className={styles.subtle}>
              No upcoming events. <Link href="/events/new">Create one</Link>.
            </p>
          ) : null}
        </div>
      </section>
    </>
  );
}
