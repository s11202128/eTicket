import Image from "next/image";
import type { UpcomingEvent } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type EventCardProps = {
  event: UpcomingEvent;
  isBooking: boolean;
  onBook: (eventId: string) => Promise<void>;
};

export function EventCard({ event, isBooking, onBook }: EventCardProps) {
  return (
    <article className={styles.card}>
      <Image
        src={event.imageUrl}
        alt={event.title}
        width={900}
        height={136}
        className={styles.eventImage}
        unoptimized
      />
      <h3>{event.title}</h3>
      <p className={styles.subtle}>{event.date}</p>
      <div className={styles.priceRow}>
        <strong>{event.price}</strong>
        <button
          className={styles.bookBtn}
          type="button"
          disabled={isBooking}
          onClick={() => void onBook(event.id)}
        >
          {isBooking ? "Booking..." : "Book Ticket"}
        </button>
      </div>
    </article>
  );
}
