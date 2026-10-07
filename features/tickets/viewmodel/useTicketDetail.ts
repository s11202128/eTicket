"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { buildIcs, downloadFile } from "@/lib/ics";
import { ticketPdfBlob, ticketPngBlob, type TicketArtwork } from "@/lib/ticketImage";
import { useAsyncData } from "@/lib/useAsyncData";
import { cancelTicket, getMyTicketByCode } from "@/features/tickets/model/tickets.repository";
import type { TicketView } from "@/features/tickets/model/tickets.types";

const PHASE_LABEL = { upcoming: "Valid", used: "Used", cancelled: "Cancelled", past: "Event ended" } as const;

function artwork(ticket: TicketView, holderName: string): TicketArtwork {
  const start = ticket.event ? new Date(ticket.event.startsAt) : null;
  return {
    code: ticket.code,
    eventTitle: ticket.event?.title ?? "Event",
    ticketTypeName: ticket.ticketTypeName,
    dateText: start
      ? new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(start)
      : "",
    timeText: start ? new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit" }).format(start) : "",
    location: ticket.event?.location ?? "",
    holderName,
    status: ticket.eventCancelled ? "Event cancelled" : PHASE_LABEL[ticket.phase],
  };
}

function fileBase(ticket: TicketView): string {
  return `ticket-${ticket.code}`;
}

export function useTicketDetail(code: string, holderName: string) {
  const toast = useToast();
  const ticket = useAsyncData(() => getMyTicketByCode(code), code);
  const [busy, setBusy] = useState<"png" | "pdf" | "share" | "cancel" | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const run = async (kind: "png" | "pdf", action: (t: TicketView) => Promise<void>) => {
    if (!ticket.data) return;
    setBusy(kind);
    try {
      await action(ticket.data);
    } catch {
      toast.error("Couldn't create the file. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPng = () =>
    run("png", async (t) => downloadFile(`${fileBase(t)}.png`, await ticketPngBlob(artwork(t, holderName))));

  const downloadPdf = () =>
    run("pdf", async (t) => downloadFile(`${fileBase(t)}.pdf`, await ticketPdfBlob(artwork(t, holderName))));

  const addToCalendar = () => {
    const t = ticket.data;
    if (!t?.event) return;
    const ics = buildIcs({
      uid: t.code,
      title: t.event.title,
      startsAt: t.event.startsAt,
      endsAt: t.event.endAt,
      location: t.event.location,
      description: `Ticket code: ${t.code}`,
      url: `${window.location.origin}/events/${t.event.slug}`,
    });
    downloadFile(`${t.event.slug}.ics`, new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  };

  // Shares the ticket image where the device supports sharing files
  // (most phones); otherwise shares or copies the event link.
  const share = async () => {
    const t = ticket.data;
    if (!t?.event) return;
    setBusy("share");
    const eventUrl = `${window.location.origin}/events/${t.event.slug}`;
    const text = `I'm going to ${t.event.title}!`;
    try {
      const file = new File([await ticketPngBlob(artwork(t, holderName))], `${fileBase(t)}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: t.event.title, text });
      } else if (navigator.share) {
        await navigator.share({ title: t.event.title, text, url: eventUrl });
      } else {
        await navigator.clipboard.writeText(`${text} ${eventUrl}`);
        toast.success("Event link copied to your clipboard.");
      }
    } catch (error) {
      // Closing the share sheet isn't an error.
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error("Couldn't share this ticket.");
      }
    } finally {
      setBusy(null);
    }
  };

  const cancel = async () => {
    const t = ticket.data;
    if (!t) return;
    setBusy("cancel");
    const result = await cancelTicket(t.id);
    setBusy(null);
    setConfirmCancel(false);
    if (!result.ok) {
      toast.error(result.errorMessage ?? "Couldn't cancel the ticket.");
      return;
    }
    toast.success("Ticket cancelled.");
    await ticket.reload();
  };

  return {
    ticket,
    busy,
    downloadPng,
    downloadPdf,
    addToCalendar,
    share,
    confirmCancel,
    setConfirmCancel,
    cancel,
  };
}
