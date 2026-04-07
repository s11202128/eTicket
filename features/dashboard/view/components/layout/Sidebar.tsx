import Link from "next/link";
import type { IconName, SidebarItem } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type SidebarProps = {
  appName: string;
  items: SidebarItem[];
};

function Icon({ name }: { name: IconName }) {
  const map: Record<IconName, string> = {
    dashboard: "▦",
    ticket: "🎫",
    event: "🎵",
    profile: "👤",
    logout: "↪",
    calendar: "📅",
    clock: "⏱",
  };

  return <span aria-hidden>{map[name]}</span>;
}

export function Sidebar({ appName, items }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.brand}>{appName}</h2>
      <nav className={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`.trim()}
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
