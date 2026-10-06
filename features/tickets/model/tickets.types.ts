import type { Tables } from "@/lib/database.types";

export type TicketWithEvent = Tables<"tickets"> & {
  events: Pick<Tables<"events">, "title" | "starts_at" | "location"> | null;
};

export type TicketResult = {
  ok: boolean;
  errorMessage?: string;
};
