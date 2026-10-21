"use client";

import { useState } from "react";
import { useAsyncData } from "@/lib/useAsyncData";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/siteConfig";
import type { DoorPaymentMethod } from "@/lib/database.types";
import { useViewer } from "@/features/auth/viewmodel/useViewer";
import {
  DOOR_NAME_MAX_LENGTH,
  clampDoorQuantity,
  doorBuyerName,
  doorCheckInOpen,
  doorSalesSummary,
  doorSellerLabel,
  doorTotal,
  maxDoorQuantity,
  ticketTypesLabel,
  type DoorSaleRecord,
} from "@/features/manager/model/doorSale";
import {
  listDoorSales,
  listDoorTicketTypes,
  sellAtDoor,
  type DoorTicket,
} from "@/features/manager/model/doorSales.repository";

export type DoorSale = {
  holderName: string;
  ticketTypeName: string;
  paymentMethod: DoorPaymentMethod;
  total: string;
  checkedIn: boolean;
  tickets: DoorTicket[];
};

type Options = {
  eventId: string;
  startsAt: string | null;
  /** Called after each sale, e.g. to refresh the check-in progress. */
  onSold: () => void;
};

// One buyer at a time: choose a type, quantity, name and how they paid, then
// sell. The screen remounts this per event (key={eventId}).
export function useDoorSale({ eventId, startsAt, onSold }: Options) {
  const types = useAsyncData(() => listDoorTicketTypes(eventId), `door-types-${eventId}`);
  const [chosenTypeId, setChosenTypeId] = useState<string | null>(null);
  const [quantityValue, setQuantityValue] = useState(1);
  const [holderName, setHolderName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<DoorPaymentMethod>("cash");
  // Before entry opens the sale would be refused with check-in on, so start off.
  const [checkInOpen] = useState(() => doorCheckInOpen(startsAt, new Date()));
  const [checkIn, setCheckIn] = useState(checkInOpen);
  const [nameError, setNameError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSelling, setIsSelling] = useState(false);
  const [sale, setSale] = useState<DoorSale | null>(null);

  // Fall back to the first type with seats left.
  const list = types.data ?? [];
  const available = list.filter((type) => type.seatsLeft !== 0);
  const ticketType = available.find((type) => type.id === chosenTypeId) ?? available[0] ?? null;
  const maxQuantity = ticketType ? maxDoorQuantity(ticketType.seatsLeft) : 1;
  const quantity = clampDoorQuantity(quantityValue, maxQuantity);
  const total = ticketType ? doorTotal(ticketType.price, quantity, paymentMethod) : 0;

  const submit = async () => {
    if (!ticketType || isSelling) return;
    const name = holderName.trim();
    if (!name) {
      setNameError("Enter the buyer's name.");
      return;
    }
    if (name.length > DOOR_NAME_MAX_LENGTH) {
      setNameError(`Keep the name under ${DOOR_NAME_MAX_LENGTH} characters.`);
      return;
    }
    setNameError(null);
    setError(null);
    setIsSelling(true);
    const result = await sellAtDoor({ ticketTypeId: ticketType.id, quantity, holderName: name, paymentMethod, checkIn });
    setIsSelling(false);
    if (!result.ok) {
      setError(result.errorMessage);
      void types.reload();
      return;
    }
    setSale({
      holderName: name,
      ticketTypeName: ticketType.name,
      paymentMethod,
      total: formatPrice(total),
      checkedIn: result.tickets.every((ticket) => ticket.status === "used"),
      tickets: result.tickets,
    });
    onSold();
    void types.reload();
  };

  // Ready for the next buyer: keeps the type and payment method, which
  // usually repeat at the gate.
  const nextBuyer = () => {
    setSale(null);
    setHolderName("");
    setQuantityValue(1);
    setCheckIn(checkInOpen);
    setNameError(null);
    setError(null);
  };

  return {
    ticketTypes: list,
    typesLoading: types.isLoading,
    typesError: types.error,
    reloadTypes: types.reload,
    ticketType,
    chooseType: (id: string) => {
      setChosenTypeId(id);
      setError(null);
    },
    quantity,
    maxQuantity,
    setQuantity: (value: number) => setQuantityValue(clampDoorQuantity(value, maxQuantity)),
    holderName,
    setHolderName: (value: string) => {
      setHolderName(value);
      if (nameError) setNameError(null);
    },
    nameError,
    paymentMethod,
    setPaymentMethod,
    checkIn,
    setCheckIn,
    checkInOpen,
    total,
    totalLabel: formatPrice(total),
    isSelling,
    error,
    submit,
    sale,
    nextBuyer,
  };
}

const HISTORY_PAGE_SIZE = 20;

// formatPrice says "Free" for 0; a till total reads better as SI$0.
const amountLabel = (amount: number) => (amount === 0 ? `${siteConfig.currency.symbol}0` : formatPrice(amount));

export type DoorSaleHistoryItem = DoorSaleRecord & {
  buyerName: string;
  typesLabel: string;
  sellerLabel: string;
  totalLabel: string;
};

// Sales made at the door for this event, with totals per payment method so
// staff can count the cash drawer. Shows 20 at a time.
export function useDoorSalesHistory(eventId: string) {
  const viewerState = useViewer();
  const viewerId = viewerState.status === "signed_in" ? viewerState.viewer.id : null;
  const sales = useAsyncData(() => listDoorSales(eventId), `door-sales-${eventId}`);
  const [visibleCount, setVisibleCount] = useState(HISTORY_PAGE_SIZE);
  // The sale whose ticket codes and QRs are shown.
  const [openSaleId, setOpenSaleId] = useState<string | null>(null);

  const all = sales.data ?? [];
  const items: DoorSaleHistoryItem[] = all.slice(0, visibleCount).map((sale) => ({
    ...sale,
    buyerName: doorBuyerName(sale.tickets),
    typesLabel: ticketTypesLabel(sale.tickets),
    sellerLabel: doorSellerLabel(sale.soldBy, viewerId),
    totalLabel: amountLabel(sale.total),
  }));
  const summary = doorSalesSummary(all);

  return {
    sales: items,
    totalCount: all.length,
    methods: summary.methods.map((method) => ({ ...method, amountLabel: amountLabel(method.amount) })),
    ticketCount: summary.tickets,
    amountLabel: amountLabel(summary.amount),
    isLoading: sales.isLoading,
    error: sales.error,
    reload: sales.reload,
    hasMore: all.length > visibleCount,
    showMore: () => setVisibleCount((count) => count + HISTORY_PAGE_SIZE),
    openSaleId,
    toggleSale: (id: string) => setOpenSaleId((current) => (current === id ? null : id)),
  };
}

export type DoorSalesHistoryViewModel = ReturnType<typeof useDoorSalesHistory>;
