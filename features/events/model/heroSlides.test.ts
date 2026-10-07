// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HERO_SLIDE_LIMIT, selectHeroSlides } from "./heroSlides.ts";
import { buildMockEvents, EXPECTED_SLIDE_IDS } from "./heroSlides.fixtures.ts";

const NOW = new Date("2026-10-08T00:00:00.000Z");
const ids = (events: { id: string }[]) => events.map((event) => event.id);

describe("selectHeroSlides", () => {
  it("shows the 5 closest upcoming events, soonest first", () => {
    assert.deepEqual(ids(selectHeroSlides(buildMockEvents(NOW), NOW)), EXPECTED_SLIDE_IDS);
  });

  it("never includes past events, events starting right now, or invalid dates", () => {
    const slides = selectHeroSlides(buildMockEvents(NOW), NOW, 100);
    for (const excluded of ["past-1", "past-2", "past-3", "now", "bad-date"]) {
      assert.ok(!ids(slides).includes(excluded), `${excluded} should be excluded`);
    }
    for (const slide of slides) {
      assert.ok(Date.parse(slide.startsAt) > NOW.getTime());
    }
  });

  it("is sorted chronologically even beyond the first 5", () => {
    const slides = selectHeroSlides(buildMockEvents(NOW), NOW, 100);
    const times = slides.map((slide) => Date.parse(slide.startsAt));
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
    assert.deepEqual(ids(slides).slice(-3), ["far-3", "far-1", "far-2"]);
  });

  it("caps the number of slides at 5 by default", () => {
    assert.equal(HERO_SLIDE_LIMIT, 5);
    assert.equal(selectHeroSlides(buildMockEvents(NOW), NOW).length, 5);
  });

  it("returns fewer slides when fewer events are upcoming", () => {
    const lateNow = new Date(NOW.getTime() + 200 * 24 * 60 * 60 * 1000);
    assert.deepEqual(ids(selectHeroSlides(buildMockEvents(NOW), lateNow)), ["far-1", "far-2"]);
  });

  it("drops an event once its start time passes", () => {
    const afterFirst = new Date(NOW.getTime() + 3 * 60 * 60 * 1000); // soon-1 started
    assert.deepEqual(ids(selectHeroSlides(buildMockEvents(NOW), afterFirst)), [
      "soon-2",
      "soon-3",
      "soon-4",
      "soon-5",
      "far-3",
    ]);
  });

  it("handles empty input and does not mutate the input array", () => {
    assert.deepEqual(selectHeroSlides([], NOW), []);
    const events = buildMockEvents(NOW);
    const before = ids(events);
    selectHeroSlides(events, NOW);
    assert.deepEqual(ids(events), before);
  });
});
