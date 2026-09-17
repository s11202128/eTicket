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
      <div className={styles.topbarCopy}><span>Member space</span><strong>{userName}</strong></div>
      {avatarUrl ? <Image src={avatarUrl} alt="" width={42} height={42} className={styles.avatar} /> : <span className={styles.avatarFallback}>{initials}</span>}
    </header>
  );
}
