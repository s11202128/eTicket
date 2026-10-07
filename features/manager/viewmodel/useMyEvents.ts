"use client";

import { useMemo, useState } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { eventTab, MANAGER_TABS, type ManagerTab } from "@/features/manager/model/eventTabs";
import { listMyEvents, type EventMeta } from "@/features/manager/model/managerEvents.repository";

export function useMyEvents() {
  const { data, error, isLoading, reload } = useAsyncData(listMyEvents, "my-events");
  const [tab, setTab] = useState<ManagerTab | null>(null);

  const grouped = useMemo(() => {
    const now = new Date();
    const groups = Object.fromEntries(MANAGER_TABS.map((item) => [item.id, [] as EventMeta[]])) as Record<ManagerTab, EventMeta[]>;
    for (const event of data ?? []) groups[eventTab(event, now)].push(event);
    // Past events: most recent first.
    groups.past.reverse();
    return groups;
  }, [data]);

  // Open the first tab that needs attention, then wherever the organizer clicks.
  const defaultTab: ManagerTab =
    (["changes", "drafts", "live", "review"] as const).find((id) => grouped[id].length > 0) ?? "drafts";
  const activeTab = tab ?? defaultTab;

  return {
    isLoading,
    error,
    reload,
    tabs: MANAGER_TABS.map((item) => ({ ...item, count: grouped[item.id].length })),
    activeTab,
    setTab,
    events: grouped[activeTab],
    hasEvents: (data?.length ?? 0) > 0,
  };
}
