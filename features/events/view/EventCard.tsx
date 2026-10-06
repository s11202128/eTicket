import Image from "next/image";
import Link from "next/link";
import type { EventSummary } from "@/features/events/model/events.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type EventCardProps = {
  event: EventSummary;
  isBooking: boolean;
  onBook: (eventId: string) => Promise<void>;
};

export function EventCard({ event, isBooking, onBook }: EventCardProps) {
  const bookLabel = event.isSoldOut ? "Sold Out" : isBooking ? "Booking..." : "Book Ticket";

  return (
    <article className={styles.card}>
      <Link href={`/events/${event.id}`}>
        <Image
          src={event.imageUrl}
          alt={event.title}
          width={900}
          height={136}
          className={styles.eventImage}
          unoptimized
        />
      </Link>
      <h3>
        <Link href={`/events/${event.id}`} className={styles.cardLink}>
          {event.title}
        </Link>
      </h3>
      <p className={styles.subtle}>{event.date}</p>
      {event.spotsLeft !== null && !event.isSoldOut ? (
        <p className={styles.subtle}>{event.spotsLeft} spots left</p>
      ) : null}
      <div className={styles.priceRow}>
        <strong>{event.price}</strong>
        <button
          className={styles.bookBtn}
          type="button"
          disabled={isBooking || event.isSoldOut || event.isPast}
          onClick={() => void onBook(event.id)}
        >
          {bookLabel}
        </button>
      </div>
    </article>
  );
}
