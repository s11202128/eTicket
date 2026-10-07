"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import { downloadCsv, toCsv } from "@/lib/csv";
import { useAsyncData } from "@/lib/useAsyncData";
import { chartDays, dailySales } from "@/features/manager/model/salesSeries";
import {
  deleteDraft,
  getMyEvent,
  listTicketTypes,
  requestCancellation,
  submitForReview,
} from "@/features/manager/model/managerEvents.repository";
import { listAttendees, listStaff } from "@/features/manager/model/manager.repository";

export type AttendeeFilter = { query: string; ticketTypeId: string; checkIn: "" | "in" | "out" };

async function loadEvent(eventId: string) {
  const meta = await getMyEvent(eventId);
  if (!meta) return null;
  const [ticketTypes, attendees, staff] = await Promise.all([listTicketTypes(eventId), listAttendees(eventId), listStaff(eventId)]);
  return { meta, ticketTypes, attendees, staff };
}

export function useManagerEvent(eventId: string) {
  const router = useRouter();
  const toast = useToast();
  const { data, error, isLoading, reload } = useAsyncData(() => loadEvent(eventId), eventId);
  const [filter, setFilter] = useState<AttendeeFilter>({ query: "", ticketTypeId: "", checkIn: "" });
  const [busy, setBusy] = useState<null | "submit" | "cancel" | "delete">(null);

  const stats = useMemo(() => {
    if (!data) return null;
    const valid = data.attendees.filter((ticket) => ticket.status !== "cancelled");
    const prices = new Map(data.ticketTypes.map((type) => [type.id, type.price]));
    const bookedAt = valid.map((ticket) => ticket.bookedAt);
    const now = new Date();
    return {
      sold: valid.length,
      capacity: data.meta.capacity,
      checkedIn: valid.filter((ticket) => ticket.status === "used").length,
      // Gross at current prices (tickets don't store the price they were bought at).
      gross: valid.reduce((sum, ticket) => sum + (prices.get(ticket.ticketTypeId) ?? 0), 0),
      cancelled: data.attendees.length - valid.length,
      series: dailySales(bookedAt, chartDays(bookedAt, now), now),
    };
  }, [data]);

  const attendees = useMemo(() => {
    if (!data) return [];
    const query = filter.query.trim().toLowerCase();
    return data.attendees.filter((ticket) => {
      if (filter.ticketTypeId && ticket.ticketTypeId !== filter.ticketTypeId) return false;
      if (filter.checkIn === "in" && !ticket.checkedInAt) return false;
      if (filter.checkIn === "out" && (ticket.checkedInAt || ticket.status === "cancelled")) return false;
      if (!query) return true;
      return [ticket.holderName, ticket.holderEmail, ticket.code].some((value) => value?.toLowerCase().includes(query));
    });
  }, [data, filter]);

  const exportCsv = () => {
    if (!data) return;
    const csv = toCsv(
      ["Name", "Email", "Ticket type", "Code", "Status", "Booked at", "Checked in at"],
      attendees.map((ticket) => [
        ticket.holderName ?? "",
        ticket.holderEmail ?? "",
        ticket.ticketTypeName,
        ticket.code,
        ticket.status,
        ticket.bookedAt,
        ticket.checkedInAt ?? "",
      ])
    );
    downloadCsv(`${data.meta.slug}-attendees.csv`, csv);
  };

  const run = async (kind: "submit" | "cancel" | "delete", action: () => Promise<{ ok: boolean; errorMessage?: string }>, success: string) => {
    setBusy(kind);
    try {
      const result = await action();
      if (!result.ok) {
        toast.show(result.errorMessage ?? "Something went wrong.", "error");
        return false;
      }
      toast.show(success, "success");
      return true;
    } finally {
      setBusy(null);
    }
  };

  return {
    data,
    error,
    isLoading,
    reload,
    stats,
    filter,
    setFilter,
    attendees,
    exportCsv,
    busy,
    submit: async () => {
      if (await run("submit", () => submitForReview(eventId), "Submitted for approval.")) await reload();
    },
    requestCancellation: async (reason: string) => {
      const done = await run("cancel", () => requestCancellation(eventId, reason), "Cancellation requested. Our team will follow up.");
      if (done) await reload();
      return done;
    },
    deleteDraft: async () => {
      if (await run("delete", () => deleteDraft(eventId), "Draft deleted.")) router.push("/manager/events");
    },
  };
}

export type ManagerEventViewModel = ReturnType<typeof useManagerEvent>;
