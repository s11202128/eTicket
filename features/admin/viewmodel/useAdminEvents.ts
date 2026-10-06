"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { useAsyncData } from "@/lib/useAsyncData";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import {
  cancelAdminEvent,
  deleteAdminEvent,
  duplicateAdminEvent,
  listAdminEvents,
} from "@/features/admin/model/adminEvents.repository";
import { listCategories } from "@/features/admin/model/categories.repository";
import type { AdminEventFilters, AdminEventRow } from "@/features/admin/model/admin.types";

export const EVENTS_PAGE_SIZE = 20;

const INITIAL_FILTERS: AdminEventFilters = {
  search: "",
  status: "all",
  categoryId: "all",
  from: "",
  to: "",
  page: 1,
};

export function useAdminEvents() {
  const router = useRouter();
  const toast = useToast();
  const [filters, setFilters] = useState<AdminEventFilters>(INITIAL_FILTERS);
  const debouncedSearch = useDebouncedValue(filters.search);
  const effectiveFilters = { ...filters, search: debouncedSearch };

  const events = useAsyncData(
    () => listAdminEvents(effectiveFilters, EVENTS_PAGE_SIZE),
    JSON.stringify(effectiveFilters)
  );
  const categories = useAsyncData(listCategories, "categories");

  const [cancelTarget, setCancelTarget] = useState<AdminEventRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminEventRow | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  // Changing any filter returns to page 1.
  const updateFilter = <K extends keyof AdminEventFilters>(key: K, value: AdminEventFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  const resetFilters = () => setFilters(INITIAL_FILTERS);

  const onDuplicate = async (event: AdminEventRow) => {
    setBusy(`duplicate-${event.id}`);
    const result = await duplicateAdminEvent(event.id);
    setBusy(null);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success("Draft copy created. Review it before publishing.");
    router.push(`/admin/events/${result.data.id}/edit`);
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setBusy("cancel");
    const result = await cancelAdminEvent(cancelTarget.id, cancelReason);
    setBusy(null);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(
      `"${cancelTarget.title}" cancelled. ${result.data} ticket${result.data === 1 ? "" : "s"} cancelled and holders notified.`
    );
    setCancelTarget(null);
    setCancelReason("");
    await events.reload();
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy("delete");
    const result = await deleteAdminEvent(deleteTarget.id);
    setBusy(null);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(`"${deleteTarget.title}" deleted.`);
    setDeleteTarget(null);
    await events.reload();
  };

  return {
    filters,
    updateFilter,
    resetFilters,
    events,
    categories: categories.data ?? [],
    busy,
    onDuplicate,
    cancelTarget,
    setCancelTarget,
    cancelReason,
    setCancelReason,
    confirmCancel,
    deleteTarget,
    setDeleteTarget,
    confirmDelete,
  };
}
