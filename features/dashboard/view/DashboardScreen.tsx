"use client";

import { DashboardView } from "@/features/dashboard/view/DashboardView";
import { useDashboardViewModel } from "@/features/dashboard/viewmodel/useDashboardViewModel";

export default function DashboardScreen() {
  const viewModel = useDashboardViewModel();

  return <DashboardView {...viewModel} />;
}
