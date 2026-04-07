import type { DashboardStat } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type StatCardProps = {
  stat: DashboardStat;
};

function StatIcon({ icon }: { icon: DashboardStat["icon"] }) {
  const iconMap: Record<DashboardStat["icon"], string> = {
    dashboard: "▦",
    ticket: "🎫",
    event: "🎵",
    profile: "👤",
    logout: "↪",
    calendar: "📅",
    clock: "⏱",
  };

  return <span aria-hidden>{iconMap[icon]}</span>;
}

export function StatCard({ stat }: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.iconRow}>
        <StatIcon icon={stat.icon} />
      </div>
      <h3>{stat.title}</h3>
      <p className={styles.value}>{stat.value}</p>
      <p className={styles.subtle}>{stat.subtitle}</p>
    </article>
  );
}
