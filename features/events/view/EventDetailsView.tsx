import Image from "next/image";
import Link from "next/link";
import type { EventDetails } from "@/features/events/model/events.types";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type EventDetailsViewProps = {
  isLoading: boolean;
  error: string | null;
  event: EventDetails | null;
  isOwner: boolean;
  myTicket: TicketSummary | null;
  notice: string | null;
  isBooking: boolean;
  isDeleting: boolean;
  onBook: () => Promise<void>;
  onDelete: () => Promise<void>;
};

function availability(event: EventDetails): string {
  if (event.capacity === null) return `Unlimited (${event.booked} booked)`;
  if (event.isSoldOut) return `Sold out (${event.capacity} seats)`;
  return `${event.spotsLeft} of ${event.capacity} seats left`;
}

export function EventDetailsView({
  isLoading,
  error,
  event,
  isOwner,
  myTicket,
  notice,
  isBooking,
  isDeleting,
  onBook,
  onDelete,
}: EventDetailsViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading event...</p>;
  }

  if (error || !event) {
    return <p className={dashboardStyles.stateText}>{error ?? "Event not found."}</p>;
  }

  return (
    <section className={styles.panel}>
      <Image
        src={event.imageUrl}
        alt={event.title}
        width={1200}
        height={260}
        className={styles.detailImage}
        unoptimized
      />

      <div className={styles.pageHeader} style={{ marginTop: 18 }}>
        <h1>{event.title}</h1>
        {event.isPast ? <span className={dashboardStyles.badgeUsed}>Past event</span> : null}
      </div>

      <dl className={styles.detailGrid}>
        <dt>When</dt>
        <dd>{event.dateTime}</dd>
        <dt>Where</dt>
        <dd>{event.location}</dd>
        <dt>Price</dt>
        <dd>{event.price}</dd>
        <dt>Seats</dt>
        <dd>{availability(event)}</dd>
      </dl>

      {event.description ? <p className={styles.description}>{event.description}</p> : null}

      <div className={styles.row}>
        {myTicket ? (
          <Link className={styles.primaryBtn} href={`/tickets/${myTicket.id}`}>
            View My Ticket
          </Link>
        ) : (
          <button
            className={styles.primaryBtn}
            type="button"
            disabled={isBooking || event.isSoldOut || event.isPast}
            onClick={() => void onBook()}
          >
            {event.isPast
              ? "Event has passed"
              : event.isSoldOut
                ? "Sold Out"
                : isBooking
                  ? "Booking..."
                  : "Book Ticket"}
          </button>
        )}

        {isOwner ? (
          <>
            <Link className={styles.secondaryBtn} href={`/events/${event.id}/edit`}>
              Edit
            </Link>
            <Link className={styles.secondaryBtn} href="/check-in">
              Check in tickets
            </Link>
            <button
              className={styles.dangerBtn}
              type="button"
              disabled={isDeleting}
              onClick={() => void onDelete()}
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </button>
          </>
        ) : null}
      </div>

      {notice ? <p className={dashboardStyles.subtle} style={{ marginTop: 12 }}>{notice}</p> : null}
    </section>
  );
}
