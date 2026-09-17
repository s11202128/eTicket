import Link from "next/link";
import type { DashboardViewName, IconName, SidebarItem } from "@/features/dashboard/model/dashboard.types";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type SidebarProps = {
  appName: string;
  items: SidebarItem[];
  activeView: DashboardViewName;
  onLogout: () => Promise<void>;
};

function Icon({ name }: { name: IconName }) {
  const map: Record<IconName, string> = {
    dashboard: "▦",
    ticket: "▱",
    event: "◇",
    profile: "○",
    logout: "↗",
  };

  return <span aria-hidden>{map[name]}</span>;
}

export function Sidebar({ appName, items, activeView, onLogout }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <Link href="/" className={styles.brand}>{appName}<span>.</span></Link>
      <nav className={styles.nav}>
        {items.map((item) => (
          item.id === "logout" ? (
            <button key={item.id} type="button" className={styles.navItem} onClick={() => void onLogout()}>
              <Icon name={item.icon} /><span>{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.id}
              href={item.href}
              className={`${styles.navItem} ${item.id === activeView ? styles.navItemActive : ""}`.trim()}
            >
              <Icon name={item.icon} /><span>{item.label}</span>
            </Link>
          )
        ))}
      </nav>
    </aside>
  );
}
