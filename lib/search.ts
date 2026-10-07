// Free-text search helpers for PostgREST filters.

// Keeps characters that are safe inside an .or() filter string
// (commas, parentheses, quotes and backslashes would change the filter's
// meaning; % and _ are ilike wildcards).
export function sanitizeSearch(value: string): string {
  return value.replace(/[^\p{L}\p{N}@.+\- ]/gu, "").trim().slice(0, 100);
}

// Pattern for ilike: escapes % and _ so they match literally.
export function ilikePattern(value: string): string {
  return `%${value.replace(/[%_\\]/g, "\\$&")}%`;
}

export const PAGE_SIZE = 20;

export function pageRange(page: number, pageSize = PAGE_SIZE): [number, number] {
  const from = Math.max(page - 1, 0) * pageSize;
  return [from, from + pageSize - 1];
}
