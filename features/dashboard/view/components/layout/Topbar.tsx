import Image from "next/image";
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
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="Profile"
          width={40}
          height={40}
          className={styles.avatar}
          unoptimized
        />
      ) : (
        <span className={styles.avatar} aria-label="Profile" />
      )}
    </header>
  );
}
