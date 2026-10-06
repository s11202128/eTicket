import styles from "@/features/shell/view/Content.module.css";
import dashboardStyles from "@/features/dashboard/view/DashboardView.module.css";

type CheckInViewProps = {
  code: string;
  isSubmitting: boolean;
  error: string | null;
  successMessage: string | null;
  onCodeChange: (value: string) => void;
  onSubmit: () => Promise<void>;
};

export function CheckInView({
  code,
  isSubmitting,
  error,
  successMessage,
  onCodeChange,
  onSubmit,
}: CheckInViewProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.pageHeader}>
        <h1>Check-in</h1>
      </div>
      <p className={dashboardStyles.subtle} style={{ margin: "8px 0 16px" }}>
        Enter the ticket code shown on the guest&apos;s ticket to mark it as used. You can only check in
        tickets for events you organise.
      </p>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit();
        }}
      >
        <label className={styles.label}>
          Ticket code
          <input
            className={`${styles.input} ${styles.code}`}
            type="text"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
            placeholder="e.g. 382E9D5FAC81"
            autoComplete="off"
            autoFocus
          />
        </label>

        {error ? <p className={styles.error}>{error}</p> : null}
        {successMessage ? <p className={styles.success}>{successMessage}</p> : null}

        <div className={styles.row}>
          <button className={styles.primaryBtn} type="submit" disabled={!code.trim() || isSubmitting}>
            {isSubmitting ? "Checking..." : "Check In"}
          </button>
        </div>
      </form>
    </section>
  );
}
