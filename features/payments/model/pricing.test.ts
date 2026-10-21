// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteOrder } from "./pricing.ts";

describe("quoteOrder", () => {
  it("multiplies the price by the quantity with no fee by default", () => {
    assert.deepEqual(quoteOrder({ unitPrice: 50, quantity: 3, serviceFeePercent: 0 }), {
      subtotal: 150,
      discount: 0,
      serviceFee: 0,
      total: 150,
    });
  });

  it("adds the service fee rounded to cents", () => {
    assert.deepEqual(quoteOrder({ unitPrice: 25, quantity: 2, serviceFeePercent: 4 }).serviceFee, 2);
    assert.deepEqual(quoteOrder({ unitPrice: 33.33, quantity: 1, serviceFeePercent: 4 }), {
      subtotal: 33.33,
      discount: 0,
      serviceFee: 1.33,
      total: 34.66,
    });
    assert.equal(quoteOrder({ unitPrice: 1.25, quantity: 1, serviceFeePercent: 10 }).serviceFee, 0.13);
  });

  it("never charges a fee on free tickets", () => {
    assert.deepEqual(quoteOrder({ unitPrice: 0, quantity: 4, serviceFeePercent: 4 }), {
      subtotal: 0,
      discount: 0,
      serviceFee: 0,
      total: 0,
    });
  });

  it("adds add-ons and charges the fee on them too (matches book_ticket)", () => {
    assert.deepEqual(
      quoteOrder({ unitPrice: 50, quantity: 1, addons: [{ price: 10, quantity: 2 }], serviceFeePercent: 4 }),
      { subtotal: 70, discount: 0, serviceFee: 2.8, total: 72.8 }
    );
  });

  it("discounts the tickets only", () => {
    assert.deepEqual(
      quoteOrder({
        unitPrice: 50,
        quantity: 2,
        addons: [{ price: 10, quantity: 1 }],
        promo: { type: "percent", value: 10 },
        serviceFeePercent: 0,
      }),
      { subtotal: 110, discount: 10, serviceFee: 0, total: 100 }
    );
    // A fixed amount is capped at the ticket price, add-ons still paid.
    assert.deepEqual(
      quoteOrder({
        unitPrice: 50,
        quantity: 1,
        addons: [{ price: 10, quantity: 1 }],
        promo: { type: "amount", value: 500 },
        serviceFeePercent: 4,
      }),
      { subtotal: 60, discount: 50, serviceFee: 0.4, total: 10.4 }
    );
  });
});
