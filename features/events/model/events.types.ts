import type { Tables } from "@/lib/database.types";

export type EventRecord = Tables<"events">;

export type CreateEventInput = {
  title: string;
  description: string | null;
  startsAt: string;
  location: string;
  price: number;
  imageUrl: string | null;
};

export type EventResult = {
  ok: boolean;
  errorMessage?: string;
};
