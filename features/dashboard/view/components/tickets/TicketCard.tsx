import type { Ticket } from "@/features/dashboard/model/dashboard.types";
import { TicketActions } from "@/features/dashboard/view/components/tickets/TicketActions";
import Image from "next/image";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketCardProps = {
  ticket: Ticket;
};

export function TicketCard({ ticket }: TicketCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.ticketHeader}>
        <div>
          <h3>{ticket.eventTitle}</h3>
          <p className={styles.ticketMeta}>{new Date(ticket.startsAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
          <p className={styles.ticketMeta}>{ticket.venue} · {ticket.location}</p>
        </div>
        <span className={ticket.status === "active" ? styles.badgeActive : styles.badgeUsed}>
          {ticket.status.toUpperCase()}
        </span>
      </div>

      <div className={styles.ticketFooter}>
        <div><span className={styles.referenceLabel}>BOOKING REFERENCE</span><strong>{ticket.bookingReference}</strong><small>{ticket.quantity} {ticket.quantity === 1 ? "admission" : "admissions"}</small></div>
        <Image src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(ticket.qrData)}`} alt={`${ticket.eventTitle} ticket QR code`} width={82} height={82} className={styles.qrImage} />
      </div>
      <TicketActions reference={ticket.bookingReference} title={ticket.eventTitle} />
    </article>
  );
}
