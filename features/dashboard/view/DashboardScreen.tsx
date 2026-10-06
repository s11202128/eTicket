"use client";

import { AppShell } from "@/features/shell/view/AppShell";
import { DashboardView } from "@/features/dashboard/view/DashboardView";
import { useDashboardViewModel } from "@/features/dashboard/viewmodel/useDashboardViewModel";

function DashboardContent() {
  const viewModel = useDashboardViewModel();
  return <DashboardView {...viewModel} />;
}

export default function DashboardScreen() {
  return (
    <AppShell activeId="dashboard">
      <DashboardContent />
    </AppShell>
  );
}
