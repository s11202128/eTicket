// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DOOR_MAX_QUANTITY,
  DOOR_PAYMENT_METHODS,
  clampDoorQuantity,
  doorBuyerName,
  doorCheckInOpen,
  doorSalesSummary,
  doorSellerLabel,
  doorTotal,
  isDoorPaymentMethod,
  maxDoorQuantity,
  seatsLeft,
  ticketTypesLabel,
  ticketsLabel,
  type DoorSaleRecord,
} from "./doorSale.ts";

describe("seatsLeft", () => {
  it("is unlimited without a quantity", () => {
    assert.equal(seatsLeft(null, 40), null);
  });

  it("subtracts sold tickets and never goes below zero", () => {
    assert.equal(seatsLeft(100, 40), 60);
    assert.equal(seatsLeft(100, 100), 0);
    assert.equal(seatsLeft(100, 103), 0);
  });
});

describe("maxDoorQuantity and clampDoorQuantity", () => {
  it("caps one sale at 20 or the seats left", () => {
    assert.equal(maxDoorQuantity(null), DOOR_MAX_QUANTITY);
    assert.equal(maxDoorQuantity(500), DOOR_MAX_QUANTITY);
    assert.equal(maxDoorQuantity(3), 3);
  });

  it("keeps the quantity between 1 and the max", () => {
    assert.equal(clampDoorQuantity(0, 20), 1);
    assert.equal(clampDoorQuantity(-4, 20), 1);
    assert.equal(clampDoorQuantity(25, 20), 20);
    assert.equal(clampDoorQuantity(2.7, 20), 2);
    assert.equal(clampDoorQuantity(Number.NaN, 20), 1);
    assert.equal(clampDoorQuantity(5, 0), 1);
  });
});

describe("doorTotal", () => {
  it("is price × quantity with no service fee", () => {
    assert.equal(doorTotal(150, 3, "cash"), 450);
    assert.equal(doorTotal(150, 2, "card"), 300);
    assert.equal(doorTotal(0.1, 3, "mobile_money"), 0.3);
    assert.equal(doorTotal(12.5, 1, "cash"), 12.5);
  });

  it("is free for complimentary tickets", () => {
    assert.equal(doorTotal(150, 4, "complimentary"), 0);
  });
});

describe("doorCheckInOpen", () => {
  const NOW = new Date(2026, 9, 21, 12, 0);
  const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString();

  it("opens 6 hours before the start", () => {
    assert.equal(doorCheckInOpen(hoursFromNow(7), NOW), false);
    assert.equal(doorCheckInOpen(hoursFromNow(6), NOW), true);
    assert.equal(doorCheckInOpen(hoursFromNow(-2), NOW), true);
    assert.equal(doorCheckInOpen(null, NOW), true);
  });
});

describe("labels", () => {
  it("pluralises tickets", () => {
    assert.equal(ticketsLabel(1), "1 ticket");
    assert.equal(ticketsLabel(4), "4 tickets");
  });

  it("lists the four payment methods in order", () => {
    assert.deepEqual(
      DOOR_PAYMENT_METHODS.map((method) => method.id),
      ["cash", "card", "mobile_money", "complimentary"]
    );
  });
});

describe("door sales history", () => {
  const ticket = (code: string, ticketTypeName = "General", holderName: string | null = "Mere") => ({
    code,
    holderName,
    status: "active" as const,
    ticketTypeName,
  });
  type Method = DoorSaleRecord["paymentMethod"];
  const sale = (paymentMethod: Method, total: number, count: number, status: DoorSaleRecord["status"] = "paid") => ({
    status,
    total,
    paymentMethod,
    tickets: Array.from({ length: count }, (_, index) => ticket(`T${index}`)),
  });

  it("totals tickets and amounts per payment method, in order", () => {
    const summary = doorSalesSummary([sale("cash", 100, 2), sale("card", 50, 1), sale("cash", 0.1, 1), sale("cash", 0.2, 1)]);
    assert.deepEqual(
      summary.methods.map(({ id, sales, tickets, amount }) => ({ id, sales, tickets, amount })),
      [
        { id: "cash", sales: 3, tickets: 4, amount: 100.3 },
        { id: "card", sales: 1, tickets: 1, amount: 50 },
        { id: "mobile_money", sales: 0, tickets: 0, amount: 0 },
        { id: "complimentary", sales: 0, tickets: 0, amount: 0 },
      ]
    );
    assert.equal(summary.sales, 4);
    assert.equal(summary.tickets, 5);
    assert.equal(summary.amount, 150.3);
  });

  it("counts complimentary tickets at no charge", () => {
    const summary = doorSalesSummary([sale("complimentary", 0, 3)]);
    assert.equal(summary.methods[3].tickets, 3);
    assert.equal(summary.amount, 0);
  });

  it("leaves out unpaid orders and unknown methods", () => {
    const summary = doorSalesSummary([
      sale("cash", 100, 2, "refunded"),
      sale("cash", 40, 1, "cancelled"),
      { ...sale("cash", 30, 1), paymentMethod: "voucher" as Method },
    ]);
    assert.equal(summary.sales, 0);
    assert.equal(summary.amount, 0);
  });

  it("recognises door payment methods", () => {
    assert.equal(isDoorPaymentMethod("mobile_money"), true);
    assert.equal(isDoorPaymentMethod("stripe"), false);
  });

  it("labels ticket types per sale", () => {
    assert.equal(ticketTypesLabel([ticket("A", "VIP"), ticket("B", "VIP")]), "2 × VIP");
    assert.equal(ticketTypesLabel([ticket("A", "VIP"), ticket("B", "General"), ticket("C", "VIP")]), "2 × VIP, 1 × General");
    assert.equal(ticketTypesLabel([]), "");
  });

  it("names the buyer from the tickets", () => {
    assert.equal(doorBuyerName([ticket("A", "VIP", "  Mere T ")]), "Mere T");
    assert.equal(doorBuyerName([ticket("A", "VIP", null), ticket("B", "VIP", "John")]), "John");
    assert.equal(doorBuyerName([ticket("A", "VIP", null)]), "No name");
  });

  it("shows the seller as You or Team member", () => {
    assert.equal(doorSellerLabel("u1", "u1"), "You");
    assert.equal(doorSellerLabel("u2", "u1"), "Team member");
    assert.equal(doorSellerLabel(null, null), "Team member");
    assert.equal(doorSellerLabel("u1", null), "Team member");
  });
});
