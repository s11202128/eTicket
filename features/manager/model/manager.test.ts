// Run with: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editMode, eventTab } from "./eventTabs.ts";
import { chartDays, dailySales } from "./salesSeries.ts";
import { liveChangeSummary, validateForSubmit, validateStep, type WizardValues } from "./eventWizard.ts";
import { parseMarkdown } from "../../../lib/markdown.ts";

const NOW = new Date(2026, 9, 7, 12, 0); // 7 Oct 2026, 12:00 local
const hoursFromNow = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString();
const localInput = (hours: number) => {
  const date = new Date(NOW.getTime() + hours * 3_600_000);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

describe("eventTab", () => {
  it("maps workflow statuses to tabs", () => {
    const at = { startsAt: hoursFromNow(48), endAt: null };
    assert.equal(eventTab({ ...at, status: "draft" }, NOW), "drafts");
    assert.equal(eventTab({ ...at, status: "pending_review" }, NOW), "review");
    assert.equal(eventTab({ ...at, status: "changes_requested" }, NOW), "changes");
    assert.equal(eventTab({ ...at, status: "rejected" }, NOW), "rejected");
    assert.equal(eventTab({ ...at, status: "published" }, NOW), "live");
    assert.equal(eventTab({ ...at, status: "cancelled" }, NOW), "past");
    assert.equal(eventTab({ ...at, status: "completed" }, NOW), "past");
  });

  it("moves live events to Past once they end", () => {
    assert.equal(eventTab({ status: "published", startsAt: hoursFromNow(-3), endAt: null }, NOW), "live");
    assert.equal(eventTab({ status: "published", startsAt: hoursFromNow(-13), endAt: null }, NOW), "past");
    assert.equal(eventTab({ status: "published", startsAt: hoursFromNow(-3), endAt: hoursFromNow(-1) }, NOW), "past");
  });

  it("knows how each status can be edited", () => {
    assert.equal(editMode("draft"), "draft");
    assert.equal(editMode("changes_requested"), "draft");
    assert.equal(editMode("published"), "live");
    assert.equal(editMode("pending_review"), "locked");
    assert.equal(editMode("cancelled"), "locked");
  });
});

describe("dailySales", () => {
  it("counts bookings per local day, oldest first, including empty days", () => {
    const sales = dailySales(
      [new Date(2026, 9, 7, 9).toISOString(), new Date(2026, 9, 7, 1).toISOString(), new Date(2026, 9, 5, 23).toISOString()],
      3,
      NOW
    );
    assert.deepEqual(sales, [
      { date: "2026-10-05", count: 1 },
      { date: "2026-10-06", count: 0 },
      { date: "2026-10-07", count: 2 },
    ]);
  });

  it("charts from the first sale, between 7 and 60 days", () => {
    assert.equal(chartDays([], NOW), 14);
    assert.equal(chartDays([hoursFromNow(-24)], NOW), 7);
    assert.equal(chartDays([hoursFromNow(-24 * 20)], NOW), 21);
    assert.equal(chartDays([hoursFromNow(-24 * 400)], NOW), 60);
  });
});

const base = (): WizardValues => ({
  title: "Honiara Live",
  categoryId: "",
  description: "A night of music by the sea for all ages.",
  startsAt: localInput(72),
  endAt: localInput(76),
  location: "Lawson Tama, Honiara",
  region: "solomon_islands",
  maxTicketsPerUser: "4",
  ticketTypes: [
    { id: "t1", key: "t1", name: "General", price: "50", quantity: "100", salesStart: "", salesEnd: "", sold: 10 },
    { id: "t2", key: "t2", name: "VIP", price: "150", quantity: "", salesStart: "", salesEnd: "", sold: 0 },
  ],
  imagePath: null,
});

describe("event wizard validation", () => {
  it("accepts a complete event", () => {
    assert.deepEqual(validateForSubmit(base(), NOW), { errors: {}, firstStep: null });
  });

  it("checks each step", () => {
    assert.ok(validateStep("basics", { ...base(), title: "A" }, NOW).title);
    assert.ok(validateStep("schedule", { ...base(), startsAt: localInput(-1) }, NOW).startsAt);
    assert.ok(validateStep("schedule", { ...base(), endAt: localInput(70) }, NOW).endAt);
    assert.ok(validateStep("tickets", { ...base(), ticketTypes: [] }, NOW).ticketTypes);
  });

  it("validates ticket types", () => {
    const values = base();
    values.ticketTypes[1] = { ...values.ticketTypes[1], name: "general", price: "-1" };
    values.ticketTypes[0] = { ...values.ticketTypes[0], quantity: "5", salesEnd: localInput(80) };
    const errors = validateStep("tickets", values, NOW);
    assert.equal(errors["ticketTypes.1.name"], "Each ticket type needs a different name.");
    assert.equal(errors["ticketTypes.1.price"], "Price must be 0 or more.");
    assert.equal(errors["ticketTypes.0.quantity"], "10 already sold; quantity can't be lower.");
    assert.equal(errors["ticketTypes.0.salesEnd"], "Sales must end before the event ends.");
  });

  it("sends the organizer to the first step with a problem", () => {
    const result = validateForSubmit({ ...base(), description: "short", location: "" }, NOW);
    assert.equal(result.firstStep, "basics");
    assert.ok(result.errors.description);
    assert.ok(result.errors.location);
  });
});

describe("liveChangeSummary", () => {
  it("treats description and image edits as minor", () => {
    const summary = liveChangeSummary(base(), { ...base(), description: "Now with fireworks at midnight!", imagePath: "u/x.jpg" });
    assert.deepEqual(summary, { changed: true, requiresReview: false, majorChanges: [] });
  });

  it("flags changes that need another review", () => {
    const edited = base();
    edited.startsAt = localInput(96);
    edited.ticketTypes[0] = { ...edited.ticketTypes[0], price: "60" };
    edited.ticketTypes[1] = { ...edited.ticketTypes[1], quantity: "40" };
    assert.deepEqual(liveChangeSummary(base(), edited).majorChanges, ["start time", "ticket prices", "lower ticket quantities"]);
  });

  it("lets organizers add seats without review", () => {
    const edited = base();
    edited.ticketTypes[0] = { ...edited.ticketTypes[0], quantity: "200" };
    assert.deepEqual(liveChangeSummary(base(), edited), { changed: true, requiresReview: false, majorChanges: [] });
  });

  it("reports no change", () => {
    assert.equal(liveChangeSummary(base(), base()).changed, false);
  });
});

describe("parseMarkdown", () => {
  it("parses headings, paragraphs, lists and emphasis", () => {
    const blocks = parseMarkdown("## Line-up\nDoors at **6pm**\nBring *friends*\n\n- Food stalls\n* Fireworks");
    assert.deepEqual(blocks, [
      { type: "heading", content: [{ type: "text", text: "Line-up" }] },
      {
        type: "paragraph",
        lines: [
          [{ type: "text", text: "Doors at " }, { type: "bold", text: "6pm" }],
          [{ type: "text", text: "Bring " }, { type: "italic", text: "friends" }],
        ],
      },
      { type: "list", items: [[{ type: "text", text: "Food stalls" }], [{ type: "text", text: "Fireworks" }]] },
    ]);
  });

  it("keeps HTML as plain text", () => {
    assert.deepEqual(parseMarkdown("<script>x</script>"), [
      { type: "paragraph", lines: [[{ type: "text", text: "<script>x</script>" }]] },
    ]);
  });
});

describe("cover crop", async () => {
  const { clampOffset, sourceRect } = await import("./cropMath.ts");
  const image = { width: 2000, height: 1000 };
  const frame = { width: 320, height: 180 };

  it("shows the centre of the image by default", () => {
    // Image scaled to 360x180: 20px hidden on each side.
    const rect = sourceRect(image, frame, 1, { x: 0, y: 0 });
    assert.deepEqual(
      [rect.x, rect.y, rect.width, rect.height].map((value) => Math.round(value * 100) / 100 + 0),
      [111.11, 0, 1777.78, 1000]
    );
  });

  it("never lets the image leave empty edges", () => {
    assert.deepEqual(clampOffset({ x: 500, y: 50 }, image, frame, 1), { x: 20, y: 0 });
    assert.deepEqual(clampOffset({ x: -500, y: -500 }, image, frame, 2), { x: -200, y: -90 });
  });

  it("maps zoom and drag to the original pixels", () => {
    const rect = sourceRect(image, frame, 2, { x: -200, y: -90 });
    assert.equal(Math.round(rect.x + rect.width), 2000);
    assert.equal(Math.round(rect.y + rect.height), 1000);
  });
});
