import Link from "next/link";
import { ICONS, type NavId, type SidebarItem } from "@/features/shell/model/navigation";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type SidebarProps = {
  appName: string;
  items: SidebarItem[];
  activeId: NavId;
};

export function Sidebar({ appName, items, activeId }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <h2 className={styles.brand}>{appName}</h2>
      <nav className={styles.nav}>
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.navItem} ${item.id === activeId ? styles.navItemActive : ""}`.trim()}
          >
            <span aria-hidden>{ICONS[item.icon]}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
