import type { DashboardSnapshot } from "./dashboard.types";
import { dashboardData } from "@/features/dashboard/model/data/dashboardData";

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  return {
    ...dashboardData,
    updatedAt: new Date().toISOString(),
  };
}
