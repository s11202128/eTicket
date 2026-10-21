// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { collectPages, subscribersCsv } from "./subscribers.ts";

const rowsUpTo = (count: number) => Array.from({ length: count }, (_, index) => ({ id: `id-${index}` }));

// Serves `all` in ranges, like .range(from, to), and records each request.
function pager<T>(all: T[]) {
  const calls: [number, number][] = [];
  const loadPage = async (from: number, to: number) => {
    calls.push([from, to]);
    return all.slice(from, to + 1);
  };
  return { calls, loadPage };
}

describe("collectPages", () => {
  it("returns nothing for an empty list with one request", async () => {
    const { calls, loadPage } = pager<{ id: string }>([]);
    assert.deepEqual(await collectPages(loadPage, 10), []);
    assert.deepEqual(calls, [[0, 9]]);
  });

  it("stops at the first short page", async () => {
    const { calls, loadPage } = pager(rowsUpTo(25));
    const rows = await collectPages(loadPage, 10);
    assert.equal(rows.length, 25);
    assert.deepEqual(calls, [[0, 9], [10, 19], [20, 29]]);
  });

  it("asks once more after an exactly full last page", async () => {
    const { calls, loadPage } = pager(rowsUpTo(20));
    assert.equal((await collectPages(loadPage, 10)).length, 20);
    assert.equal(calls.length, 3);
  });

  it("drops rows repeated across pages", async () => {
    // A new sign-up pushed id-9 onto the second page as well.
    const pages = [rowsUpTo(10), [{ id: "id-9" }, { id: "id-10" }]];
    const rows = await collectPages(async () => pages.shift() ?? [], 10);
    assert.deepEqual(rows.map((row) => row.id), [...rowsUpTo(10).map((row) => row.id), "id-10"]);
  });

  it("stops at the limit", async () => {
    const { calls, loadPage } = pager(rowsUpTo(50));
    assert.equal((await collectPages(loadPage, 10, 15)).length, 15);
    assert.equal(calls.length, 2);
  });
});

describe("subscribersCsv", () => {
  it("writes a header and one line per subscriber", () => {
    const csv = subscribersCsv(
      [
        { email: "ana@example.com", createdAt: "2026-10-01T10:00:00Z" },
        { email: "ben@example.com", createdAt: "2026-10-02T11:30:00Z" },
      ],
      (iso) => iso.slice(0, 10)
    );
    assert.equal(csv, "Email,Subscribed at\r\nana@example.com,2026-10-01\r\nben@example.com,2026-10-02");
  });

  it("neutralises cells that a spreadsheet would run as formulas", () => {
    const csv = subscribersCsv([{ email: "=cmd@example.com", createdAt: "x" }], (iso) => iso);
    assert.equal(csv.split("\r\n")[1], "'=cmd@example.com,x");
  });
});
