import Image from "next/image";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { TicketActions } from "@/features/tickets/view/TicketActions";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketCardProps = {
  ticket: TicketSummary;
};

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.ticketHeader}>
        <div>
          <h3>{ticket.eventTitle}</h3>
          <p className={styles.ticketMeta}>
            {ticket.date} | {ticket.location}
          </p>
        </div>
        <span className={ticket.status === "Active" ? styles.badgeActive : styles.badgeUsed}>
          {ticket.status}
        </span>
      </div>

      <Image
        src={ticket.qrImageUrl}
        alt={`${ticket.eventTitle} QR`}
        width={92}
        height={92}
        className={styles.qrImage}
      />

      <TicketActions ticket={ticket} />
    </article>
  );
}
