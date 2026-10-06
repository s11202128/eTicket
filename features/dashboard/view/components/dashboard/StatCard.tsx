import type { DashboardStat } from "@/features/dashboard/model/dashboard.types";
import { ICONS } from "@/features/shell/model/navigation";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type StatCardProps = {
  stat: DashboardStat;
};

export function StatCard({ stat }: StatCardProps) {
  return (
    <article className={styles.card}>
      <div className={styles.iconRow}>
        <span aria-hidden>{ICONS[stat.icon]}</span>
      </div>
      <h3>{stat.title}</h3>
      <p className={styles.value}>{stat.value}</p>
      <p className={styles.subtle}>{stat.subtitle}</p>
    </article>
  );
}
