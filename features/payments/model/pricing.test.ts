// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quoteOrder } from "./pricing.ts";

describe("quoteOrder", () => {
  it("multiplies the price by the quantity with no fee by default", () => {
    assert.deepEqual(quoteOrder(50, 3, 0), { subtotal: 150, serviceFee: 0, total: 150 });
  });

  it("adds the service fee rounded to cents", () => {
    assert.deepEqual(quoteOrder(25, 2, 4), { subtotal: 50, serviceFee: 2, total: 52 });
    assert.deepEqual(quoteOrder(12.5, 1, 4), { subtotal: 12.5, serviceFee: 0.5, total: 13 });
    assert.deepEqual(quoteOrder(33.33, 1, 4), { subtotal: 33.33, serviceFee: 1.33, total: 34.66 });
    assert.deepEqual(quoteOrder(1.25, 1, 10), { subtotal: 1.25, serviceFee: 0.13, total: 1.38 });
  });

  it("never charges a fee on free tickets", () => {
    assert.deepEqual(quoteOrder(0, 4, 4), { subtotal: 0, serviceFee: 0, total: 0 });
  });
});
