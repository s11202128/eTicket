// Mock events for checking the hero slider logic (tests only, never shown on
// the site). Dates are relative to `now`, so the fixtures never go stale.

export type MockEvent = { id: string; title: string; startsAt: string };

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export function buildMockEvents(now: Date): MockEvent[] {
  const at = (offsetMs: number) => new Date(now.getTime() + offsetMs).toISOString();

  // Deliberately shuffled so sorting is actually exercised.
  return [
    { id: "far-1", title: "Pacific Games Closing Ceremony", startsAt: at(240 * DAY) },
    { id: "soon-3", title: "Honiara Jazz Night", startsAt: at(3 * DAY) },
    { id: "past-1", title: "Last Month's Festival", startsAt: at(-30 * DAY) },
    { id: "soon-5", title: "Auki Food Fair", startsAt: at(9 * DAY) },
    { id: "now", title: "Starting Right Now", startsAt: at(0) },
    { id: "soon-1", title: "Waterfront Sunset Concert", startsAt: at(2 * HOUR) },
    { id: "far-2", title: "New Year's Eve 2027", startsAt: at(400 * DAY) },
    { id: "past-2", title: "Yesterday's Match", startsAt: at(-1 * DAY) },
    { id: "soon-4", title: "Gizo Surf Classic", startsAt: at(6 * DAY) },
    { id: "bad-date", title: "Date To Be Confirmed", startsAt: "not-a-date" },
    { id: "soon-2", title: "Solomon Islands Arts Expo", startsAt: at(1 * DAY) },
    { id: "past-3", title: "Started Ten Minutes Ago", startsAt: at(-10 * 60 * 1000) },
    { id: "far-3", title: "Melanesian Cultural Festival", startsAt: at(120 * DAY) },
  ];
}

// The 5 closest upcoming events, in the order the slider must show them.
export const EXPECTED_SLIDE_IDS = ["soon-1", "soon-2", "soon-3", "soon-4", "soon-5"];
