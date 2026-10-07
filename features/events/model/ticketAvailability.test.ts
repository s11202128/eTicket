// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { defaultTypeId, maxQuantity, typeAvailability, type PublicTicketType } from "./ticketAvailability.ts";

const NOW = new Date("2026-10-07T12:00:00Z");
const type = (patch: Partial<PublicTicketType>): PublicTicketType => ({
  id: "t",
  name: "General",
  description: null,
  price: 50,
  quantity: 100,
  sold: 0,
  salesStart: null,
  salesEnd: null,
  ...patch,
});

describe("typeAvailability", () => {
  it("reports seats left and low stock", () => {
    assert.deepEqual(typeAvailability(type({ sold: 40 }), NOW), { state: "on_sale", left: 60, lowStock: false });
    assert.deepEqual(typeAvailability(type({ sold: 93 }), NOW), { state: "on_sale", left: 7, lowStock: true });
    assert.deepEqual(typeAvailability(type({ quantity: null, sold: 500 }), NOW), { state: "on_sale", left: null, lowStock: false });
  });

  it("knows when a type is sold out or outside its sales window", () => {
    assert.deepEqual(typeAvailability(type({ sold: 100 }), NOW), { state: "sold_out" });
    assert.deepEqual(typeAvailability(type({ salesStart: "2026-10-08T00:00:00Z" }), NOW), {
      state: "not_started",
      startsAt: "2026-10-08T00:00:00Z",
    });
    assert.deepEqual(typeAvailability(type({ salesEnd: "2026-10-07T11:00:00Z" }), NOW), { state: "ended" });
  });
});

describe("maxQuantity", () => {
  it("is limited by the per-person limit and seats left", () => {
    assert.equal(maxQuantity(type({}), 4, NOW), 4);
    assert.equal(maxQuantity(type({ sold: 98 }), 4, NOW), 2);
    assert.equal(maxQuantity(type({ quantity: null }), 6, NOW), 6);
    assert.equal(maxQuantity(type({ sold: 100 }), 4, NOW), 0);
  });
});

describe("defaultTypeId", () => {
  it("preselects the first type on sale", () => {
    const types = [type({ id: "early", sold: 100 }), type({ id: "regular" }), type({ id: "vip" })];
    assert.equal(defaultTypeId(types, NOW), "regular");
    assert.equal(defaultTypeId([type({ sold: 100 })], NOW), null);
  });
});
