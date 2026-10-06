import Image from "next/image";
import Link from "next/link";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type TopbarProps = {
  notifications: number;
  avatarUrl: string;
};

export function Topbar({ notifications, avatarUrl }: TopbarProps) {
  const notificationLabel =
    notifications > 0
      ? `${notifications} upcoming ${notifications === 1 ? "event" : "events"} in the next 7 days`
      : "No upcoming events in the next 7 days";

  return (
    <header className={styles.topbar}>
      <Link className={styles.notify} href="/tickets" aria-label={notificationLabel} title={notificationLabel}>
        🔔
        {notifications > 0 ? <span className={styles.notifyDot} /> : null}
      </Link>
      <Link href="/profile" aria-label="Profile">
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
          <span className={styles.avatar} />
        )}
      </Link>
    </header>
  );
}
