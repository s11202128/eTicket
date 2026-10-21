// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addonLines, maxAddonQuantity, type PublicAddon } from "./addonAvailability.ts";

const addon = (patch: Partial<PublicAddon>): PublicAddon => ({
  id: "a",
  name: "Parking",
  description: null,
  price: 10,
  quantity: null,
  sold: 0,
  ...patch,
});

describe("maxAddonQuantity", () => {
  it("caps unlimited add-ons at the per-booking limit", () => {
    assert.equal(maxAddonQuantity(addon({})), 20);
  });

  it("never offers more than are left", () => {
    assert.equal(maxAddonQuantity(addon({ quantity: 30, sold: 27 })), 3);
    assert.equal(maxAddonQuantity(addon({ quantity: 30, sold: 30 })), 0);
    assert.equal(maxAddonQuantity(addon({ quantity: 30, sold: 35 })), 0);
  });
});

describe("addonLines", () => {
  it("drops add-ons the buyer set back to zero", () => {
    assert.deepEqual(addonLines({ a: 2, b: 0, c: 1 }), [
      { id: "a", quantity: 2 },
      { id: "c", quantity: 1 },
    ]);
  });
});
