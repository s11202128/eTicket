"use client";

import { DashboardView } from "@/features/dashboard/view/DashboardView";
import { useDashboardViewModel } from "@/features/dashboard/viewmodel/useDashboardViewModel";
import type { DashboardViewName } from "@/features/dashboard/model/dashboard.types";

export default function DashboardScreen({ activeView = "dashboard" }: { activeView?: DashboardViewName }) {
  const viewModel = useDashboardViewModel(activeView);

  return <DashboardView {...viewModel} />;
}
