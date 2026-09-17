import type { Event } from "@/features/dashboard/model/dashboard.types";
import { formatMoney } from "@/features/dashboard/model/formatters";
import Image from "next/image";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type EventCardProps = {
  event: Event;
  isBooking: boolean;
  onBook: (event: Event) => Promise<void>;
};

export function EventCard({ event, isBooking, onBook }: EventCardProps) {
  const availability = event.remainingTickets === 0
    ? "Sold out"
    : event.remainingTickets < 50
      ? `Only ${event.remainingTickets} left`
      : `${event.remainingTickets} places open`;

  return (
    <article className={styles.card}>
      <div className={styles.eventImageWrap}>
        <Image src={event.imageUrl} alt="" fill sizes="(max-width: 760px) 90vw, (max-width: 1000px) 45vw, 30vw" className={styles.eventImage} loading="eager" />
        <div className={styles.eventBadges}><span>{event.category}</span>{event.featured ? <span>Local highlight</span> : null}</div>
      </div>
      <p className={styles.eventDate}>{new Date(event.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
      <h3>{event.title}</h3>
      <p className={styles.subtle}>{event.venue} · {event.location}</p>
      <p className={styles.eventDescription}>{event.description}</p>
      <div className={styles.priceRow}>
        <div><strong>{formatMoney(event.priceCents, event.currency)}</strong><small className={event.remainingTickets < 50 ? styles.availabilityLow : styles.availability}>{availability}</small></div>
        <button className={styles.bookBtn} type="button" disabled={isBooking || event.remainingTickets === 0} onClick={() => void onBook(event)}>
          {isBooking ? "Booking…" : event.remainingTickets === 0 ? "Sold out" : "Get ticket"}
        </button>
      </div>
    </article>
  );
}
