"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { downloadCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { useAsyncData } from "@/lib/useAsyncData";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { subscribersCsv } from "@/features/admin/model/subscribers";
import {
  countSubscribers,
  listSubscribers,
  listSubscribersForExport,
  removeSubscriber,
  SUBSCRIBERS_EXPORT_LIMIT,
  type SubscriberRow,
} from "@/features/admin/model/subscribers.repository";

export const SUBSCRIBERS_PAGE_SIZE = 25;

export function useSubscribers() {
  const toast = useToast();
  const [searchInput, setSearchInput] = useState("");
  const search = useDebouncedValue(searchInput);
  const [page, setPage] = useState(1);
  const { data, error, isLoading, reload } = useAsyncData(
    () => listSubscribers(search, page, SUBSCRIBERS_PAGE_SIZE),
    `${search}|${page}`
  );
  // Whole list, shown in the header whatever the search.
  const count = useAsyncData(countSubscribers, "subscriber-count");

  const [removeTarget, setRemoveTarget] = useState<SubscriberRow | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const confirmRemove = async () => {
    if (!removeTarget) return;
    setIsRemoving(true);
    const result = await removeSubscriber(removeTarget.id);
    setIsRemoving(false);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(`${removeTarget.email} removed from the newsletter.`);
    setRemoveTarget(null);
    // Step back when the last row on a later page goes.
    if (data?.rows.length === 1 && page > 1) setPage(page - 1);
    else await reload();
    await count.reload();
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const rows = await listSubscribersForExport(search);
      downloadCsv(`newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`, subscribersCsv(rows, formatDateTime));
      toast.success(
        rows.length >= SUBSCRIBERS_EXPORT_LIMIT
          ? `Exported the first ${SUBSCRIBERS_EXPORT_LIMIT} subscribers. Search to export the rest.`
          : `Exported ${rows.length} subscriber${rows.length === 1 ? "" : "s"}.`
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    searchInput,
    setSearch: (value: string) => {
      setSearchInput(value);
      setPage(1);
    },
    // The debounced search the rows below match.
    search,
    page,
    setPage,
    rows: data?.rows ?? [],
    total: data?.total ?? 0,
    subscriberCount: count.data,
    error,
    isLoading: isLoading || !data,
    reload,
    removeTarget,
    setRemoveTarget,
    isRemoving,
    confirmRemove,
    isExporting,
    exportCsv,
  };
}
