// Ticket type availability for the booking panel. Pure, unit-tested.
// The database re-checks everything when booking (book_ticket).

export type PublicTicketType = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  // null = unlimited
  quantity: number | null;
  sold: number;
  salesStart: string | null;
  salesEnd: string | null;
};

export const LOW_STOCK = 10;

export type TypeAvailability =
  | { state: "on_sale"; left: number | null; lowStock: boolean }
  | { state: "sold_out" }
  | { state: "not_started"; startsAt: string }
  | { state: "ended" };

export function typeAvailability(type: PublicTicketType, now: Date): TypeAvailability {
  if (type.salesStart && new Date(type.salesStart) > now) return { state: "not_started", startsAt: type.salesStart };
  if (type.salesEnd && new Date(type.salesEnd) <= now) return { state: "ended" };
  if (type.quantity === null) return { state: "on_sale", left: null, lowStock: false };
  const left = Math.max(type.quantity - type.sold, 0);
  if (left === 0) return { state: "sold_out" };
  return { state: "on_sale", left, lowStock: left <= LOW_STOCK };
}

/** Most tickets of this type one booking can take (0 when not on sale). */
export function maxQuantity(type: PublicTicketType, perPerson: number, now: Date): number {
  const availability = typeAvailability(type, now);
  if (availability.state !== "on_sale") return 0;
  return Math.max(Math.min(perPerson, availability.left ?? perPerson), 0);
}

/** The type to preselect: the first one on sale, in display order. */
export function defaultTypeId(types: PublicTicketType[], now: Date): string | null {
  return types.find((type) => typeAvailability(type, now).state === "on_sale")?.id ?? null;
}
