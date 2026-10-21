// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { validateContactForm, validateNewsletterEmail } from "./contact.schema.ts";

describe("validateNewsletterEmail", () => {
  it("trims and lower-cases the address", () => {
    assert.deepEqual(validateNewsletterEmail("  Ana@Example.COM "), { ok: true, email: "ana@example.com" });
  });

  it("rejects empty, malformed and over-long addresses", () => {
    assert.equal(validateNewsletterEmail("").ok, false);
    assert.equal(validateNewsletterEmail("ana@example").ok, false);
    assert.equal(validateNewsletterEmail("ana @example.com").ok, false);
    assert.equal(validateNewsletterEmail(`${"a".repeat(250)}@x.co`).ok, false);
  });
});

describe("validateContactForm", () => {
  it("accepts a filled-in form and tidies it", () => {
    assert.deepEqual(validateContactForm({ name: " Ana ", email: "ANA@example.com", message: " Hi! " }), {
      ok: true,
      data: { name: "Ana", email: "ana@example.com", message: "Hi!" },
    });
  });

  it("reports one error per field", () => {
    const result = validateContactForm({ name: "  ", email: "nope", message: "x".repeat(4001) });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.deepEqual(Object.keys(result.errors).sort(), ["email", "message", "name"]);
    }
  });
});
