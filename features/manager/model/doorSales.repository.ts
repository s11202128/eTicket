import { supabase } from "@/lib/supabase";
import type { DoorPaymentMethod, OrderStatus, TicketDbStatus } from "@/lib/database.types";
import {
  DOOR_PAYMENT_METHODS,
  isDoorPaymentMethod,
  seatsLeft,
  type DoorSaleRecord,
} from "@/features/manager/model/doorSale";

// Selling tickets at the gate (organizers, door staff and admins). Card and
// mobile money are only recorded; the organizer takes the payment themselves.

export type DoorTicketType = {
  id: string;
  name: string;
  price: number;
  /** null = unlimited. */
  seatsLeft: number | null;
};

// Door sales ignore the online sales window (they run until the event ends),
// so every type is listed; only sold-out ones can't be chosen.
export async function listDoorTicketTypes(eventId: string): Promise<DoorTicketType[]> {
  const [{ data, error }, { data: counts, error: countError }] = await Promise.all([
    supabase
      .from("ticket_types")
      .select("id, name, price, quantity, sales_start, sales_end, sort_order")
      .eq("event_id", eventId)
      .order("sort_order"),
    supabase.rpc("get_ticket_type_counts", { p_event_ids: [eventId] }),
  ]);
  if (error) throw new Error(error.message);
  if (countError) throw new Error(countError.message);
  const sold = new Map(counts.map((row) => [row.ticket_type_id, row.sold]));

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    seatsLeft: seatsLeft(row.quantity, sold.get(row.id) ?? 0),
  }));
}

export type DoorTicket = { id: string; code: string; status: TicketDbStatus; holderName: string | null };

export type DoorSaleInput = {
  ticketTypeId: string;
  quantity: number;
  holderName: string;
  paymentMethod: DoorPaymentMethod;
  checkIn: boolean;
};

export type DoorSaleResult = { ok: true; tickets: DoorTicket[] } | { ok: false; errorMessage: string };

export async function sellAtDoor(input: DoorSaleInput): Promise<DoorSaleResult> {
  const { data, error } = await supabase.rpc("door_sell_tickets", {
    p_ticket_type_id: input.ticketTypeId,
    p_quantity: input.quantity,
    p_holder_name: input.holderName.trim(),
    p_payment_method: input.paymentMethod,
    p_check_in: input.checkIn,
  });
  if (error) return { ok: false, errorMessage: error.message };
  return {
    ok: true,
    tickets: data.map((row) => ({
      id: row.id,
      code: row.code,
      status: row.status as TicketDbStatus,
      holderName: row.holder_name,
    })),
  };
}

// lib/database.types.ts doesn't list tickets.order_id as a relationship yet,
// so the embedded tickets are typed here.
type DoorOrderRow = {
  id: string;
  created_at: string;
  status: string;
  total: number;
  payment_provider: string;
  sold_by: string | null;
  tickets: { code: string; holder_name: string | null; status: string; ticket_types: { name: string } | null }[];
};

// Door sales for one event, newest first. RLS decides what comes back: door
// staff see the sales they made, the organizer and admins see every sale.
export async function listDoorSales(eventId: string): Promise<DoorSaleRecord[]> {
  const { data, error } = await supabase
    .from("orders")
    .select("id, created_at, status, total, payment_provider, sold_by, tickets(code, holder_name, status, ticket_types(name))")
    .eq("event_id", eventId)
    .eq("channel", "door")
    .in("payment_provider", DOOR_PAYMENT_METHODS.map((method) => method.id))
    .order("created_at", { ascending: false })
    .overrideTypes<DoorOrderRow[], { merge: false }>();
  if (error) throw new Error(error.message);

  return data.flatMap((row) =>
    isDoorPaymentMethod(row.payment_provider)
      ? [
          {
            id: row.id,
            createdAt: row.created_at,
            status: row.status as OrderStatus,
            total: Number(row.total),
            paymentMethod: row.payment_provider,
            soldBy: row.sold_by,
            tickets: row.tickets
              .map((ticket) => ({
                code: ticket.code,
                holderName: ticket.holder_name,
                status: ticket.status as TicketDbStatus,
                ticketTypeName: ticket.ticket_types?.name ?? "Ticket",
              }))
              .sort((a, b) => a.code.localeCompare(b.code)),
          },
        ]
      : []
  );
}
