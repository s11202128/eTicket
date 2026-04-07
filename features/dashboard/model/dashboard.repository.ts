import type { DashboardSnapshot } from "./dashboard.types";

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot> {
  // This mock keeps the MVVM flow active while backend tables are still in progress.
  return {
    title: "eTicket Dashboard",
    updatedAt: new Date().toISOString(),
    stats: [
      { label: "Tickets Sold", value: 1240, trend: "up" },
      { label: "Events Active", value: 18, trend: "flat" },
      { label: "Refund Requests", value: 12, trend: "down" },
    ],
  };
}
