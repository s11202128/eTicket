"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ticketQrUrl } from "@/features/tickets/model/tickets.repository";
import type { TicketSummary } from "@/features/tickets/model/tickets.types";

type TicketActionsViewModel = {
  message: string | null;
  onView: () => void;
  onDownload: () => Promise<void>;
  onShare: () => Promise<void>;
};

export function useTicketActions(ticket: TicketSummary): TicketActionsViewModel {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);

  const onView = () => {
    router.push(`/tickets/${ticket.id}`);
  };

  const onDownload = async () => {
    setMessage(null);
    try {
      const response = await fetch(ticketQrUrl(ticket.code, 600));
      if (!response.ok) throw new Error("QR download failed");

      const blobUrl = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `eticket-${ticket.code}.png`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    } catch {
      setMessage("Could not download the QR code.");
    }
  };

  const onShare = async () => {
    setMessage(null);
    const text = `My ticket for ${ticket.eventTitle} on ${ticket.dateTime} at ${ticket.location}. Code: ${ticket.code}`;

    try {
      if (navigator.share) {
        await navigator.share({ title: ticket.eventTitle, text });
        return;
      }

      await navigator.clipboard.writeText(text);
      setMessage("Ticket details copied to clipboard.");
    } catch (error) {
      // Closing the share sheet is not an error worth reporting.
      if (error instanceof DOMException && error.name === "AbortError") return;
      setMessage("Could not share this ticket.");
    }
  };

  return { message, onView, onDownload, onShare };
}
