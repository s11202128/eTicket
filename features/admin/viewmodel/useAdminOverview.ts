"use client";

import { useAsyncData } from "@/lib/useAsyncData";
import { fetchOverview } from "@/features/admin/model/overview.repository";

export function useAdminOverview() {
  return useAsyncData(fetchOverview, "overview");
}
