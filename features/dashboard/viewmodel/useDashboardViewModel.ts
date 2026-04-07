"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchDashboardSnapshot } from "@/features/dashboard/model/dashboard.repository";
import { hasActiveSession } from "@/features/auth/model/session.repository";
import type { DashboardSnapshot, DashboardStat } from "@/features/dashboard/model/dashboard.types";

type DashboardViewModel = {
  isLoading: boolean;
  error: string | null;
  title: string;
  lastUpdated: string;
  stats: DashboardStat[];
  statusMessage: string;
};

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  title: "Dashboard",
  updatedAt: "",
  stats: [],
};

export function useDashboardViewModel(): DashboardViewModel {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadDashboard = async () => {
      try {
        const isAuthenticated = await hasActiveSession();
        if (!isAuthenticated) {
          router.replace("/login");
          return;
        }

        const data = await fetchDashboardSnapshot();
        if (isMounted) {
          setSnapshot(data);
          setError(null);
        }
      } catch {
        if (isMounted) {
          setError("Unable to load dashboard data.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const lastUpdated = useMemo(() => {
    if (!snapshot.updatedAt) return "";
    return new Date(snapshot.updatedAt).toLocaleString();
  }, [snapshot.updatedAt]);

  const statusMessage = useMemo(() => {
    const hasIncident = snapshot.stats.some((stat) => stat.trend === "down");
    return hasIncident ? "Monitor refund trends closely." : "Operations are stable today.";
  }, [snapshot.stats]);

  return {
    isLoading,
    error,
    title: snapshot.title,
    lastUpdated,
    stats: snapshot.stats,
    statusMessage,
  };
}
