import type { UpcomingEvent } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type EventCardProps = {
  event: UpcomingEvent;
};

export function EventCard({ event }: EventCardProps) {
  return (
    <article className={styles.card}>
      <img src={event.imageUrl} alt={event.title} className={styles.eventImage} />
      <h3>{event.title}</h3>
      <p className={styles.subtle}>{event.date}</p>
      <div className={styles.priceRow}>
        <strong>{event.price}</strong>
        <button className={styles.bookBtn} type="button">
          Book Ticket
        </button>
      </div>
    </article>
  );
}
