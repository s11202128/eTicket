"use client";

import type { ReactNode } from "react";
import { SIDEBAR_ITEMS, type NavId } from "@/features/shell/model/navigation";
import { useAppShellViewModel } from "@/features/shell/viewmodel/useAppShellViewModel";
import { Sidebar } from "@/features/shell/view/Sidebar";
import { Topbar } from "@/features/shell/view/Topbar";
import styles from "@/features/dashboard/view/DashboardView.module.css";

type AppShellProps = {
  activeId: NavId;
  children: ReactNode;
};

// Layout for signed-in pages: sidebar, top bar and a session guard.
export function AppShell({ activeId, children }: AppShellProps) {
  const { isReady, avatarUrl, notifications } = useAppShellViewModel();

  if (!isReady) {
    return (
      <main className={styles.page}>
        <p className={styles.stateText}>Loading...</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.layout}>
        <Sidebar appName="E-Ticket" items={SIDEBAR_ITEMS} activeId={activeId} />

        <div className={styles.contentArea}>
          <Topbar notifications={notifications} avatarUrl={avatarUrl} />
          <div className={styles.main}>{children}</div>
        </div>
      </div>
    </main>
  );
}
