import type { Tables } from "@/lib/database.types";

export type EventRecord = Tables<"events">;

export type EventInput = {
  title: string;
  description: string | null;
  startsAt: string;
  location: string;
  price: number;
  capacity: number | null;
  imageUrl: string | null;
};

export type EventResult = {
  ok: boolean;
  errorMessage?: string;
};

export type CreateEventResult = EventResult & {
  eventId?: string;
};

// Display-ready event for cards and lists.
export type EventSummary = {
  id: string;
  title: string;
  date: string;
  dateTime: string;
  location: string;
  price: string;
  imageUrl: string;
  spotsLeft: number | null;
  isSoldOut: boolean;
  isPast: boolean;
};

export type EventDetails = EventSummary & {
  description: string | null;
  startsAtIso: string;
  priceValue: number;
  imageUrlRaw: string | null;
  capacity: number | null;
  booked: number;
  createdBy: string;
};
