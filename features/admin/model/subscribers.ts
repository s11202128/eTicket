// Newsletter subscribers export: paging through the whole list and building
// the CSV. Pure, unit-tested.

import { toCsv } from "../../../lib/csv.ts";

// PostgREST returns at most 1000 rows per request.
export const EXPORT_BATCH_SIZE = 1000;

// Loads pages of `batchSize` rows until a short page (the last one) or
// `limit` rows. Rows are de-duplicated by id: someone signing up while the
// export runs shifts later pages by one row.
export async function collectPages<T extends { id: string }>(
  loadPage: (from: number, to: number) => Promise<T[]>,
  batchSize = EXPORT_BATCH_SIZE,
  limit = Number.POSITIVE_INFINITY
): Promise<T[]> {
  const seen = new Set<string>();
  const rows: T[] = [];
  for (let from = 0; rows.length < limit; from += batchSize) {
    const page = await loadPage(from, from + batchSize - 1);
    for (const row of page) {
      if (seen.has(row.id) || rows.length >= limit) continue;
      seen.add(row.id);
      rows.push(row);
    }
    if (page.length < batchSize) break;
  }
  return rows;
}

export function subscribersCsv(
  rows: { email: string; createdAt: string }[],
  formatDate: (iso: string) => string
): string {
  return toCsv(
    ["Email", "Subscribed at"],
    rows.map((row) => [row.email, formatDate(row.createdAt)])
  );
}
