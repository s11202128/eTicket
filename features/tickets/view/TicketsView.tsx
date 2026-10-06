import Link from "next/link";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { TicketCard } from "@/features/tickets/view/TicketCard";
import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type TicketsViewProps = {
  isLoading: boolean;
  error: string | null;
  notice: string | null;
  activeTickets: TicketSummary[];
  pastTickets: TicketSummary[];
  cancellingTicketId: string | null;
  onCancelTicket: (ticketId: string) => Promise<void>;
};

export function TicketsView({
  isLoading,
  error,
  notice,
  activeTickets,
  pastTickets,
  cancellingTicketId,
  onCancelTicket,
}: TicketsViewProps) {
  if (isLoading) {
    return <p className={dashboardStyles.stateText}>Loading tickets...</p>;
  }

  if (error) {
    return <p className={dashboardStyles.stateText}>{error}</p>;
  }

  return (
    <>
      <div className={styles.pageHeader}>
        <h1>My Tickets</h1>
        <Link className={styles.secondaryBtn} href="/events">
          Browse Events
        </Link>
      </div>

      {notice ? <p className={dashboardStyles.subtle}>{notice}</p> : null}

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Active</h2>
        <div className={dashboardStyles.ticketGrid}>
          {activeTickets.map((ticket) => (
            <div key={ticket.id} style={{ display: "grid", gap: 8 }}>
              <TicketCard ticket={ticket} />
              <button
                className={styles.dangerBtn}
                type="button"
                disabled={cancellingTicketId === ticket.id}
                onClick={() => void onCancelTicket(ticket.id)}
              >
                {cancellingTicketId === ticket.id ? "Cancelling..." : "Cancel Ticket"}
              </button>
            </div>
          ))}
          {activeTickets.length === 0 ? (
            <p className={dashboardStyles.subtle}>No active tickets.</p>
          ) : null}
        </div>
      </section>

      <section>
        <h2 className={dashboardStyles.sectionTitle}>Past &amp; Cancelled</h2>
        <div className={dashboardStyles.ticketGrid}>
          {pastTickets.map((ticket) => (
            <TicketCard key={ticket.id} ticket={ticket} />
          ))}
          {pastTickets.length === 0 ? (
            <p className={dashboardStyles.subtle}>Nothing here yet.</p>
          ) : null}
        </div>
      </section>
    </>
  );
}
