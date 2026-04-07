export type DashboardTrend = "up" | "flat" | "down";

export type DashboardStat = {
  label: string;
  value: number;
  trend: DashboardTrend;
};

export type DashboardSnapshot = {
  title: string;
  updatedAt: string;
  stats: DashboardStat[];
};
