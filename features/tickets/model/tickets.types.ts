import type { Tables } from "@/lib/database.types";

export type TicketWithEvent = Tables<"tickets"> & {
  events: Pick<Tables<"events">, "id" | "title" | "starts_at" | "location"> | null;
};

export type TicketResult = {
  ok: boolean;
  errorMessage?: string;
};

export type RedeemResult = TicketResult & {
  eventTitle?: string;
  holderEmail?: string;
};

// "Expired" means still active in the database but the event has passed.
export type TicketStatus = "Active" | "Used" | "Cancelled" | "Expired";

// Display-ready ticket for cards and lists.
export type TicketSummary = {
  id: string;
  eventId: string | null;
  eventTitle: string;
  date: string;
  dateTime: string;
  location: string;
  status: TicketStatus;
  code: string;
  qrImageUrl: string;
};
