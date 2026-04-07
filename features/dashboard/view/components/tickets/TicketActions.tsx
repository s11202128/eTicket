import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketActionsProps = {
  onView?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
};

export function TicketActions({ onView, onDownload, onShare }: TicketActionsProps) {
  return (
    <div className={styles.ticketActions}>
      <button className={styles.actionBtn} type="button" onClick={onView}>
        View
      </button>
      <button className={styles.actionBtn} type="button" onClick={onDownload}>
        Download
      </button>
      <button className={styles.actionBtn} type="button" onClick={onShare}>
        Share
      </button>
    </div>
  );
}
