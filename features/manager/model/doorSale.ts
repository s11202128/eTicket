// Door sales at the gate: payment methods, seats left, totals and the
// sales history. Pure, unit-tested. Mirrors door_sell_tickets (1-20
// tickets, no service fee).

import type { DoorPaymentMethod, OrderStatus, TicketDbStatus } from "../../../lib/database.types.ts";

export const DOOR_MAX_QUANTITY = 20;
export const DOOR_NAME_MAX_LENGTH = 100;

export const DOOR_PAYMENT_METHODS: { id: DoorPaymentMethod; label: string }[] = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "mobile_money", label: "Mobile money" },
  { id: "complimentary", label: "Complimentary" },
];

/** Seats left for a ticket type; null = unlimited. Never below zero. */
export function seatsLeft(quantity: number | null, sold: number): number | null {
  if (quantity === null) return null;
  return Math.max(quantity - sold, 0);
}

/** Most tickets one door sale can take: the RPC limit, capped by seats left. */
export function maxDoorQuantity(left: number | null): number {
  return left === null ? DOOR_MAX_QUANTITY : Math.min(left, DOOR_MAX_QUANTITY);
}

/** Keeps a typed or stepped quantity between 1 and the max. */
export function clampDoorQuantity(value: number, max: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.floor(value), 1), Math.max(max, 1));
}

/** What the buyer pays: price × quantity, nothing for complimentary. */
export function doorTotal(price: number, quantity: number, method: DoorPaymentMethod): number {
  if (method === "complimentary") return 0;
  // Round to cents so 3 × 0.1 shows as 0.3.
  return Math.round(price * quantity * 100) / 100;
}

// Mirrors check_in_ticket: entry opens 6 hours before the start.
const CHECK_IN_OPENS_BEFORE_MS = 6 * 60 * 60 * 1000;

/** Whether tickets sold now can be checked in straight away. */
export function doorCheckInOpen(startsAt: string | null, now: Date): boolean {
  if (!startsAt) return true;
  return now.getTime() >= new Date(startsAt).getTime() - CHECK_IN_OPENS_BEFORE_MS;
}

/** "1 ticket" / "3 tickets". */
export function ticketsLabel(count: number): string {
  return `${count} ticket${count === 1 ? "" : "s"}`;
}

// ---------------------------------------------------------------------------
// Door sales history
// ---------------------------------------------------------------------------
export type DoorSaleTicket = { code: string; holderName: string | null; status: TicketDbStatus; ticketTypeName: string };

export type DoorSaleRecord = {
  id: string;
  createdAt: string;
  status: OrderStatus;
  total: number;
  paymentMethod: DoorPaymentMethod;
  soldBy: string | null;
  tickets: DoorSaleTicket[];
};

export type DoorMethodTotal = { id: DoorPaymentMethod; label: string; sales: number; tickets: number; amount: number };

export type DoorSalesSummary = { methods: DoorMethodTotal[]; sales: number; tickets: number; amount: number };

/** Narrows orders.payment_provider (a plain text column) to a door method. */
export function isDoorPaymentMethod(value: string): value is DoorPaymentMethod {
  return DOOR_PAYMENT_METHODS.some((method) => method.id === value);
}

/**
 * Totals per payment method, in DOOR_PAYMENT_METHODS order (every method
 * listed, even at zero), plus the overall total. Only paid orders count, so
 * the cash line matches what should be in the drawer.
 */
export function doorSalesSummary(
  sales: readonly Pick<DoorSaleRecord, "status" | "total" | "paymentMethod" | "tickets">[]
): DoorSalesSummary {
  const methods = DOOR_PAYMENT_METHODS.map((method) => ({ ...method, sales: 0, tickets: 0, amount: 0 }));
  for (const sale of sales) {
    if (sale.status !== "paid") continue;
    const line = methods.find((method) => method.id === sale.paymentMethod);
    if (!line) continue;
    line.sales += 1;
    line.tickets += sale.tickets.length;
    // Sum in cents so 0.1 + 0.2 stays 0.3.
    line.amount = Math.round(line.amount * 100 + sale.total * 100) / 100;
  }
  return {
    methods,
    sales: methods.reduce((sum, method) => sum + method.sales, 0),
    tickets: methods.reduce((sum, method) => sum + method.tickets, 0),
    amount: Math.round(methods.reduce((sum, method) => sum + method.amount * 100, 0)) / 100,
  };
}

/** "2 × VIP" or "2 × VIP, 1 × General": ticket counts per type, in first-seen order. */
export function ticketTypesLabel(tickets: readonly Pick<DoorSaleTicket, "ticketTypeName">[]): string {
  const counts = new Map<string, number>();
  for (const ticket of tickets) counts.set(ticket.ticketTypeName, (counts.get(ticket.ticketTypeName) ?? 0) + 1);
  return [...counts].map(([name, count]) => `${count} × ${name}`).join(", ");
}

/** Name on the tickets (one buyer per door sale). */
export function doorBuyerName(tickets: readonly Pick<DoorSaleTicket, "holderName">[]): string {
  return tickets.find((ticket) => ticket.holderName?.trim())?.holderName?.trim() ?? "No name";
}

/**
 * Who sold it. Organizers can't always read other people's profiles, so
 * other sellers are only "Team member".
 */
export function doorSellerLabel(soldBy: string | null, viewerId: string | null): string {
  return soldBy !== null && soldBy === viewerId ? "You" : "Team member";
}
