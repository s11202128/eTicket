import type { Event } from "@/features/dashboard/model/dashboard.types";
import Image from "next/image";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type EventCardProps = {
  event: Event;
  isBooking: boolean;
  onBook: (event: Event) => Promise<void>;
};

export function EventCard({ event, isBooking, onBook }: EventCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.eventImageWrap}><Image src={event.imageUrl} alt="" fill sizes="(max-width: 760px) 90vw, (max-width: 1000px) 45vw, 30vw" className={styles.eventImage} loading="eager" /><span>{event.category}</span></div>
      <p className={styles.eventDate}>{new Date(event.startsAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</p>
      <h3>{event.title}</h3>
      <p className={styles.subtle}>{event.venue} · {event.location}</p>
      <div className={styles.priceRow}>
        <strong>{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(event.priceCents / 100)}</strong>
        <button className={styles.bookBtn} type="button" disabled={isBooking || event.remainingTickets === 0} onClick={() => void onBook(event)}>
          {isBooking ? "Booking…" : event.remainingTickets === 0 ? "Sold out" : "Get ticket"}
        </button>
      </div>
    </article>
  );
}
