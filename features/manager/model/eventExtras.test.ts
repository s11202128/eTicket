// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  addonFields,
  discountLabel,
  EMPTY_ADDON,
  EMPTY_PROMO_CODE,
  friendlyExtrasError,
  moveItem,
  normalizePromoCode,
  promoAvailability,
  promoCodeFields,
  sortOrderChanges,
  usageLabel,
  validateAddon,
  validatePromoCode,
  type PromoCodeValues,
} from "./eventExtras.ts";

const NOW = new Date(2026, 9, 7, 12, 0);
const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString();
const promo = (values: Partial<PromoCodeValues>): PromoCodeValues => ({ ...EMPTY_PROMO_CODE, code: "EARLY10", discountValue: "10", ...values });
const price = (amount: number) => `SI$${amount}`;

describe("promo codes", () => {
  it("normalizes codes to trimmed upper case", () => {
    assert.equal(normalizePromoCode("  early-bird_10 "), "EARLY-BIRD_10");
  });

  it("accepts a valid code", () => {
    assert.deepEqual(validatePromoCode(promo({ code: " early10 " })), {});
  });

  it("mirrors the database checks on the code", () => {
    assert.equal(validatePromoCode(promo({ code: "" })).code, "Enter a code.");
    assert.equal(validatePromoCode(promo({ code: "AB" })).code, "Use 3 to 30 characters.");
    assert.equal(validatePromoCode(promo({ code: "A".repeat(31) })).code, "Use 3 to 30 characters.");
    assert.equal(validatePromoCode(promo({ code: "TEN OFF" })).code, "Use letters, numbers, dashes and underscores only.");
  });

  it("checks the discount", () => {
    assert.ok(validatePromoCode(promo({ discountValue: "" })).discountValue);
    assert.ok(validatePromoCode(promo({ discountValue: "0" })).discountValue);
    assert.ok(validatePromoCode(promo({ discountValue: "101" })).discountValue);
    assert.equal(validatePromoCode(promo({ discountValue: "100" })).discountValue, undefined);
    assert.equal(validatePromoCode(promo({ discountType: "amount", discountValue: "250" })).discountValue, undefined);
  });

  it("checks the limit against uses so far", () => {
    assert.ok(validatePromoCode(promo({ maxUses: "1.5" })).maxUses);
    assert.ok(validatePromoCode(promo({ maxUses: "0" })).maxUses);
    assert.equal(validatePromoCode(promo({ maxUses: "3" }), 5).maxUses, "Already used 5 times; the limit can't be lower.");
    assert.equal(validatePromoCode(promo({ maxUses: "5" }), 5).maxUses, undefined);
  });

  it("needs the end after the start", () => {
    const errors = validatePromoCode(promo({ startsAt: "2026-10-10T10:00", endsAt: "2026-10-10T09:00" }));
    assert.equal(errors.endsAt, "The end must be after the start.");
  });

  it("builds database fields", () => {
    const fields = promoCodeFields(promo({ code: "vip ", discountType: "amount", discountValue: "5.555", maxUses: "" }));
    assert.equal(fields.code, "VIP");
    assert.equal(fields.discount_value, 5.56);
    assert.equal(fields.max_uses, null);
    assert.equal(fields.starts_at, null);
  });

  it("labels discounts and usage", () => {
    assert.equal(discountLabel("percent", 10, price), "10% off");
    assert.equal(discountLabel("amount", 5, price), "SI$5 off");
    assert.equal(usageLabel(1, null, "used"), "1 use");
    assert.equal(usageLabel(3, null, "used"), "3 uses");
    assert.equal(usageLabel(3, 50, "used"), "3 / 50 used");
    assert.equal(usageLabel(2, null, "sold"), "2 sold");
    assert.equal(usageLabel(2, 10, "sold"), "2 / 10 sold");
  });

  it("knows when a code can be used", () => {
    const base = { isActive: true, startsAt: null, endsAt: null, maxUses: null, uses: 0 };
    assert.equal(promoAvailability(base, NOW), "active");
    assert.equal(promoAvailability({ ...base, isActive: false }, NOW), "paused");
    assert.equal(promoAvailability({ ...base, startsAt: hoursFromNow(2) }, NOW), "scheduled");
    assert.equal(promoAvailability({ ...base, endsAt: hoursFromNow(-1) }, NOW), "expired");
    assert.equal(promoAvailability({ ...base, maxUses: 3, uses: 3 }, NOW), "used_up");
  });
});

describe("add-ons", () => {
  const addon = { ...EMPTY_ADDON, name: "Parking", price: "20" };

  it("accepts a valid add-on", () => {
    assert.deepEqual(validateAddon(addon), {});
    assert.deepEqual(validateAddon({ ...addon, price: "0" }), {});
  });

  it("mirrors the database checks", () => {
    assert.ok(validateAddon({ ...addon, name: "  " }).name);
    assert.ok(validateAddon({ ...addon, name: "x".repeat(61) }).name);
    assert.ok(validateAddon({ ...addon, description: "x".repeat(301) }).description);
    assert.ok(validateAddon({ ...addon, price: "-1" }).price);
    assert.ok(validateAddon({ ...addon, price: "" }).price);
    assert.ok(validateAddon({ ...addon, quantity: "0" }).quantity);
    assert.equal(validateAddon({ ...addon, quantity: "4" }, 6).quantity, "6 already sold; quantity can't be lower.");
  });

  it("builds database fields", () => {
    assert.deepEqual(addonFields({ ...addon, name: " Parking ", description: "  ", quantity: "50" }), {
      name: "Parking",
      description: null,
      price: 20,
      quantity: 50,
      is_active: true,
    });
  });
});

describe("reordering", () => {
  const list = ["a", "b", "c", "d"];
  const rows = (ids: string[], orders: number[]) => ids.map((id, index) => ({ id, sortOrder: orders[index] }));

  it("moves an item one step up or down", () => {
    assert.deepEqual(moveItem(list, 2, -1), ["a", "c", "b", "d"]);
    assert.deepEqual(moveItem(list, 0, 1), ["b", "a", "c", "d"]);
    assert.deepEqual(list, ["a", "b", "c", "d"]);
  });

  it("leaves the list alone at the ends or out of range", () => {
    assert.deepEqual(moveItem(list, 0, -1), list);
    assert.deepEqual(moveItem(list, 3, 1), list);
    assert.deepEqual(moveItem(list, 7, -1), list);
    assert.deepEqual(moveItem([], 0, 1), []);
  });

  it("writes only the rows whose position changed", () => {
    // b and c swapped in an already tidy list.
    assert.deepEqual(sortOrderChanges(rows(["a", "c", "b", "d"], [0, 2, 1, 3])), [
      { id: "c", sortOrder: 1 },
      { id: "b", sortOrder: 2 },
    ]);
    assert.deepEqual(sortOrderChanges(rows(["a", "b"], [0, 1])), []);
  });

  it("renumbers gaps and ties from older data", () => {
    assert.deepEqual(sortOrderChanges(rows(["a", "b", "c"], [0, 0, 0])), [
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ]);
    assert.deepEqual(sortOrderChanges(rows(["a", "b"], [5, 10])), [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
    ]);
  });
});

describe("friendlyExtrasError", () => {
  it("maps Postgres errors to plain words", () => {
    assert.equal(friendlyExtrasError({ code: "23505", message: "duplicate" }, "promo", "save"), "That code already exists for this event.");
    assert.equal(friendlyExtrasError({ code: "23503", message: "fk" }, "addon", "delete"), "This add-on has been sold; hide it instead.");
    assert.equal(friendlyExtrasError({ message: "Network down" }, "addon", "save"), "Network down");
  });
});
