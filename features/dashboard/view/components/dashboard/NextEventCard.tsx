import Link from "next/link";
import type { Ticket } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type NextEventCardProps = {
  ticket: Ticket;
};

export function NextEventCard({ ticket }: NextEventCardProps) {
  return (
    <section className={styles.nextEvent} style={{ backgroundImage: `url(${ticket.imageUrl})` }}>
      <div className={styles.nextEventOverlay} />
      <div className={styles.nextEventContent}>
        <span className={styles.eyebrowLight}>UP NEXT</span>
        <h2>{ticket.eventTitle}</h2>
        <p className={styles.eventMeta}>
          {new Date(ticket.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })} · {ticket.venue}
        </p>
        <Link className={styles.lightButton} href="/tickets">Open ticket</Link>
      </div>
    </section>
  );
}
