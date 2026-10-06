"use client";

import type { TicketSummary } from "@/features/tickets/model/tickets.types";
import { useTicketActions } from "@/features/tickets/viewmodel/useTicketActions";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketActionsProps = {
  ticket: TicketSummary;
  showView?: boolean;
};

export function TicketActions({ ticket, showView = true }: TicketActionsProps) {
  const { message, onView, onDownload, onShare } = useTicketActions(ticket);

  return (
    <>
      <div className={styles.ticketActions}>
        {showView ? (
          <button className={styles.actionBtn} type="button" onClick={onView}>
            View
          </button>
        ) : null}
        <button className={styles.actionBtn} type="button" onClick={() => void onDownload()}>
          Download
        </button>
        <button className={styles.actionBtn} type="button" onClick={() => void onShare()}>
          Share
        </button>
      </div>
      {message ? <p className={styles.subtle}>{message}</p> : null}
    </>
  );
}
