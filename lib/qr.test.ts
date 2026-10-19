// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseTicketCode, ticketQrPayload } from "./qr.ts";

describe("parseTicketCode", () => {
  it("reads the QR payload printed on tickets", () => {
    assert.equal(parseTicketCode(ticketQrPayload("95AAD3EAD5D0")), "95AAD3EAD5D0");
  });

  it("accepts a bare code, lower case and stray whitespace", () => {
    assert.equal(parseTicketCode("  95aad3ead5d0\n"), "95AAD3EAD5D0");
    assert.equal(parseTicketCode("eticket-95aad3ead5d0"), "95AAD3EAD5D0");
    assert.equal(parseTicketCode("95AA D3EA D5D0"), "95AAD3EAD5D0");
  });

  it("finds the code inside a link", () => {
    assert.equal(parseTicketCode("https://example.com/tickets/95AAD3EAD5D0"), "95AAD3EAD5D0");
  });

  it("passes anything else through so the server can answer not found", () => {
    assert.equal(parseTicketCode(" hello "), "hello");
    assert.equal(parseTicketCode("   "), "");
  });
});
