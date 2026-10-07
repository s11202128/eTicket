import type { CheckInResult, EventStatus, TicketDbStatus } from "@/lib/database.types";

export type TicketResult = {
  ok: boolean;
  errorMessage?: string;
};

export type BookResult = TicketResult & { code?: string };

export type CheckInOutcome = TicketResult & {
  result?: CheckInResult;
  code?: string;
  eventTitle?: string | null;
  holderName?: string | null;
  checkedInAt?: string | null;
  ticketTypeName?: string | null;
};

// "upcoming": active and the event hasn't finished; "past": active but over.
export type TicketPhase = "upcoming" | "used" | "cancelled" | "past";

export type TicketEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  endAt: string | null;
  location: string;
  imageSrc: string;
  status: EventStatus;
};

export type TicketView = {
  id: string;
  code: string;
  status: TicketDbStatus;
  phase: TicketPhase;
  createdAt: string;
  checkedInAt: string | null;
  cancelledAt: string | null;
  event: TicketEvent | null;
  canCancel: boolean;
};
