import Link from "next/link";
import type { EventDetails, EventSummary } from "@/features/events/model/events.types";
import { EventCard } from "@/features/events/view/EventCard";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type EventsViewProps = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  upcomingEvents: EventSummary[];
  myEvents: EventDetails[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

function formatSeats(event: EventDetails): string {
  return event.capacity === null ? `${event.booked} booked` : `${event.booked} / ${event.capacity}`;
}

export function EventsView({
  isLoading,
  error,
  notice,
  upcomingEvents,
  myEvents,
  bookingEventId,
  onBookTicket,
}: EventsViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading events...</p>;
  }

  if (error) {
    return <p className={dashboardStyles.stateText}>{error}</p>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>Events</h1>
        <Link className={styles.primaryBtn} href="/events/new">
          Create Event
        </Link>
      </div>

      {notice ? <p className={dashboardStyles.subtle}>{notice}</p> : null}

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Upcoming Events</h2>
        <div className={dashboardStyles.eventGrid}>
          {upcomingEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              isBooking={bookingEventId === event.id}
              onBook={onBookTicket}
            />
          ))}
          {upcomingEvents.length === 0 ? (
            <p className={dashboardStyles.subtle}>No upcoming events yet.</p>
          ) : null}
        </div>
      </section>

      <section className={styles.panel}>
        <h2 className={dashboardStyles.sectionTitle}>Events I Organise</h2>
        {myEvents.length === 0 ? (
          <p className={dashboardStyles.subtle}>You haven&apos;t created any events yet.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Date</th>
                  <th>Tickets</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {myEvents.map((event) => (
                  <tr key={event.id}>
                    <td>
                      <Link href={`/events/${event.id}`} className={dashboardStyles.cardLink}>
                        {event.title}
                      </Link>
                      {event.isPast ? <span className={dashboardStyles.subtle}> (past)</span> : null}
                    </td>
                    <td>{event.dateTime}</td>
                    <td>{formatSeats(event)}</td>
                    <td>
                      <Link className={styles.secondaryBtn} href={`/events/${event.id}/edit`}>
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
