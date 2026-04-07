import styles from "@/features/dashboard/view/DashboardView.module.css";

type TopbarProps = {
  notifications: number;
  avatarUrl: string;
};

export function Topbar({ notifications, avatarUrl }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <button className={styles.notify} type="button" aria-label={`Notifications ${notifications}`}>
        🔔
        {notifications > 0 ? <span className={styles.notifyDot} /> : null}
      </button>
      <img src={avatarUrl} alt="Profile" className={styles.avatar} />
    </header>
  );
}
