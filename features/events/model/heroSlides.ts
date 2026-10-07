// Picks the events shown in the homepage hero slider.
// No imports on purpose, so the tests can run with plain `node --test`.

export const HERO_SLIDE_LIMIT = 5;

export type HeroCandidate = { startsAt: string };

/**
 * The `limit` soonest upcoming events, soonest first.
 * - Events that have started (startsAt <= now) are excluded.
 * - Events with an unparseable date are excluded.
 * - Ties keep their original order (Array.prototype.sort is stable).
 */
export function selectHeroSlides<T extends HeroCandidate>(
  events: readonly T[],
  now: Date = new Date(),
  limit: number = HERO_SLIDE_LIMIT
): T[] {
  const nowMs = now.getTime();

  return events
    .map((event) => ({ event, startsMs: Date.parse(event.startsAt) }))
    .filter(({ startsMs }) => Number.isFinite(startsMs) && startsMs > nowMs)
    .sort((a, b) => a.startsMs - b.startsMs)
    .slice(0, Math.max(0, limit))
    .map(({ event }) => event);
}
