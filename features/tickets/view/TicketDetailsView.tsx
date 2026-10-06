import Image from "next/image";
import Link from "next/link";
import { ticketQrUrl } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { TicketActions } from "@/features/tickets/view/TicketActions";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type TicketDetailsViewProps = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  ticket: TicketSummary | null;
  isCancelling: boolean;
  onCancel: () => Promise<void>;
};

export function TicketDetailsView({
  isLoading,
  error,
  notice,
  ticket,
  isCancelling,
  onCancel,
}: TicketDetailsViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading ticket...</p>;
  }

  if (error || !ticket) {
    return <p className={dashboardStyles.stateText}>{error ?? "Ticket not found."}</p>;
  }

  return (
    <section className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1>{ticket.eventTitle}</h1>
        <span className={ticket.status === "Active" ? dashboardStyles.badgeActive : dashboardStyles.badgeUsed}>
          {ticket.status}
        </span>
      </div>

      <dl className={styles.detailGrid}>
        <dt>When</dt>
        <dd>{ticket.dateTime}</dd>
        <dt>Where</dt>
        <dd>{ticket.location}</dd>
        <dt>Ticket code</dt>
        <dd className={styles.code}>{ticket.code}</dd>
      </dl>

      <Image
        src={ticketQrUrl(ticket.code, 440)}
        alt={`${ticket.eventTitle} QR code`}
        width={220}
        height={220}
        className={styles.bigQr}
      />
      <p className={dashboardStyles.subtle}>Show this QR code or ticket code at the entrance.</p>

      <TicketActions ticket={ticket} showView={false} />

      <div className={styles.row} style={{ marginTop: 16 }}>
        {ticket.eventId ? (
          <Link className={styles.secondaryBtn} href={`/events/${ticket.eventId}`}>
            View Event
          </Link>
        ) : null}
        {ticket.status === "Active" ? (
          <button
            className={styles.dangerBtn}
            type="button"
            disabled={isCancelling}
            onClick={() => void onCancel()}
          >
            {isCancelling ? "Cancelling..." : "Cancel Ticket"}
          </button>
        ) : null}
      </div>

      {notice ? <p className={dashboardStyles.subtle} style={{ marginTop: 12 }}>{notice}</p> : null}
    </section>
  );
}
