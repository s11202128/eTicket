import type { NextEvent } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type NextEventCardProps = {
  event: NextEvent;
};

export function NextEventCard({ event }: NextEventCardProps) {
  return (
    <section className={styles.nextEvent} style={{ backgroundImage: `url(${event.imageUrl})` }}>
      <div className={styles.nextEventOverlay} />
      <div className={styles.nextEventContent}>
        <h2>{event.title}</h2>
        <p className={styles.eventMeta}>
          {event.dateTime} | {event.location}
        </p>
        <button className={styles.lightButton} type="button">
          {event.ctaLabel}
        </button>
      </div>
    </section>
  );
}
