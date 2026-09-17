import styles from "@/features/dashboard/view/DashboardView.module.css";

type TicketActionsProps = {
  reference: string;
  title: string;
};

export function TicketActions({ reference, title }: TicketActionsProps) {
  const details = `${title} — booking ${reference}`;
  const download = () => {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([details], { type: "text/plain" }));
    link.download = `${reference}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "My eTicket", text: details });
    else await navigator.clipboard.writeText(details);
  };
  return (
    <div className={styles.ticketActions}>
      <button className={styles.actionBtn} type="button" onClick={download}>Download</button>
      <button className={styles.actionBtn} type="button" onClick={() => void share()}>Share</button>
    </div>
  );
}
