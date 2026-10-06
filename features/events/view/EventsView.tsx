import type { EventSummary } from "@/features/events/model/events.types";
import { EventCard } from "@/features/events/view/EventCard";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type EventsViewProps = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  upcomingEvents: EventSummary[];
  bookingEventId: string | null;
  onBookTicket: (eventId: string) => Promise<void>;
};

export function EventsView({
  isLoading,
  error,
  notice,
  upcomingEvents,
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

    </>
  );
}
