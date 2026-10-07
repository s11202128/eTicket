// Tickets booked per day for the sales chart. Pure, unit-tested.
// Days are the viewer's local calendar days.

export type SalesPoint = { date: string; count: number };

const pad = (value: number) => String(value).padStart(2, "0");

export function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** The last `days` days up to and including `now`, oldest first. */
export function dailySales(bookedAt: string[], days: number, now: Date): SalesPoint[] {
  const counts = new Map<string, number>();
  for (const iso of bookedAt) {
    const key = localDayKey(new Date(iso));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const points: SalesPoint[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const key = localDayKey(day);
    points.push({ date: key, count: counts.get(key) ?? 0 });
  }
  return points;
}

/** Days to chart: from the first sale (at least 7, at most 60) up to today. */
export function chartDays(bookedAt: string[], now: Date): number {
  if (bookedAt.length === 0) return 14;
  const first = Math.min(...bookedAt.map((iso) => new Date(iso).getTime()));
  const span = Math.ceil((now.getTime() - first) / (24 * 60 * 60 * 1000)) + 1;
  return Math.min(Math.max(span, 7), 60);
}
