"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { downloadCsv, toCsv } from "@/lib/csv";
import { formatDateTime } from "@/lib/format";
import { useAsyncData } from "@/lib/useAsyncData";
import { useDebouncedValue } from "@/lib/useDebouncedValue";
import { listEventOptions } from "@/features/admin/model/adminEvents.repository";
import {
  adminCancelBooking,
  EXPORT_LIMIT,
  listBookings,
  listBookingsForExport,
} from "@/features/admin/model/bookings.repository";
import type { BookingFilters, BookingRow } from "@/features/admin/model/admin.types";

export const BOOKINGS_PAGE_SIZE = 25;

const INITIAL: BookingFilters = { search: "", status: "all", eventId: "all", page: 1 };

export function useBookings() {
  const toast = useToast();
  const [filters, setFilters] = useState<BookingFilters>(INITIAL);
  const search = useDebouncedValue(filters.search);
  const effective = { ...filters, search };

  const bookings = useAsyncData(() => listBookings(effective, BOOKINGS_PAGE_SIZE), JSON.stringify(effective));
  const events = useAsyncData(listEventOptions, "event-options");

  const [cancelTarget, setCancelTarget] = useState<BookingRow | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const updateFilter = <K extends keyof BookingFilters>(key: K, value: BookingFilters[K]) => {
    setFilters((current) => ({ ...current, [key]: value, page: key === "page" ? (value as number) : 1 }));
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    const result = await adminCancelBooking(cancelTarget.id);
    setIsCancelling(false);
    if (!result.ok) {
      toast.error(result.errorMessage);
      return;
    }
    toast.success(`Ticket ${cancelTarget.code} cancelled. The holder was notified.`);
    setCancelTarget(null);
    await bookings.reload();
  };

  const exportCsv = async () => {
    setIsExporting(true);
    try {
      const rows = await listBookingsForExport({ search, status: filters.status, eventId: filters.eventId });
      const csv = toCsv(
        ["Code", "Status", "Event", "Event date", "Holder", "Email", "Booked at", "Checked in at"],
        rows.map((row) => [
          row.code,
          row.status,
          row.eventTitle,
          formatDateTime(row.eventStartsAt),
          row.holderName ?? "",
          row.holderEmail ?? "",
          formatDateTime(row.createdAt),
          row.checkedInAt ? formatDateTime(row.checkedInAt) : "",
        ])
      );
      downloadCsv(`bookings-${new Date().toISOString().slice(0, 10)}.csv`, csv);
      toast.success(
        rows.length >= EXPORT_LIMIT
          ? `Exported the first ${EXPORT_LIMIT} bookings. Narrow the filters to export the rest.`
          : `Exported ${rows.length} booking${rows.length === 1 ? "" : "s"}.`
      );
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  };

  return {
    filters,
    updateFilter,
    resetFilters: () => setFilters(INITIAL),
    bookings,
    eventOptions: events.data ?? [],
    cancelTarget,
    setCancelTarget,
    isCancelling,
    confirmCancel,
    isExporting,
    exportCsv,
  };
}
