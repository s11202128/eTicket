import Image from "next/image";
import type { RecentTicket } from "@/features/dashboard/model/dashboard.types";
import { TicketActions } from "@/features/dashboard/view/components/tickets/TicketActions";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketCardProps = {
  ticket: RecentTicket;
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

      <TicketActions />
    </article>
  );
}
