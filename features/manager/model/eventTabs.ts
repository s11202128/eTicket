// Which "My Events" tab an organizer's event belongs to. Pure, unit-tested.

import type { EventStatus } from "../../../lib/database.types.ts";

export type ManagerTab = "drafts" | "review" | "changes" | "live" | "past" | "rejected";

export const MANAGER_TABS: { id: ManagerTab; label: string }[] = [
  { id: "drafts", label: "Drafts" },
  { id: "review", label: "In Review" },
  { id: "changes", label: "Changes Requested" },
  { id: "live", label: "Live" },
  { id: "past", label: "Past" },
  { id: "rejected", label: "Rejected" },
];

// Without an end time an event counts as running for 12 hours (the same
// window check-in uses).
const DEFAULT_DURATION_MS = 12 * 60 * 60 * 1000;

export function eventHasEnded(event: { startsAt: string; endAt: string | null }, now: Date): boolean {
  const end = event.endAt ? new Date(event.endAt).getTime() : new Date(event.startsAt).getTime() + DEFAULT_DURATION_MS;
  return end < now.getTime();
}

export function eventTab(event: { status: EventStatus; startsAt: string; endAt: string | null }, now: Date): ManagerTab {
  switch (event.status) {
    case "draft":
      return "drafts";
    case "pending_review":
      return "review";
    case "changes_requested":
      return "changes";
    case "rejected":
      return "rejected";
    case "published":
      return eventHasEnded(event, now) ? "past" : "live";
    case "completed":
    case "cancelled":
      return "past";
  }
}

// Organizers edit drafts and events with changes requested directly; live
// events go through update_published_event (major changes need review).
export type EditMode = "draft" | "live" | "locked";

export function editMode(status: EventStatus): EditMode {
  if (status === "draft" || status === "changes_requested") return "draft";
  if (status === "published") return "live";
  return "locked";
}
