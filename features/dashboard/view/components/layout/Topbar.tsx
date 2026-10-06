import Image from "next/image";
import styles from "@/features/dashboard/view/DashboardView.module.css";
import Image from "next/image";

type TopbarProps = {
  userName: string;
  avatarUrl: string | null;
};

export function Topbar({ userName, avatarUrl }: TopbarProps) {
  const initials = userName.split(" ").filter(Boolean).map((part) => part[0]).slice(0, 2).join("").toUpperCase() || "ET";
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
