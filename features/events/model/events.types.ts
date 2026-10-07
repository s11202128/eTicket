import type { EventRegion, EventStatus, Tables } from "@/lib/database.types";

export type EventRecord = Tables<"events">;

// Display-ready published event for cards, lists and the detail page.
// Dates stay as ISO strings and are formatted in the visitor's time zone.
export type PublicEvent = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  startsAt: string;
  endAt: string | null;
  location: string;
  price: number;
  imageSrc: string;
  categoryName: string | null;
  categorySlug: string | null;
  capacity: number | null;
  sold: number;
  spotsLeft: number | null;
  isSoldOut: boolean;
  isPast: boolean;
  maxTicketsPerUser: number;
  status: EventStatus;
  region: EventRegion;
  // null for events hosted by the platform itself.
  organizerId: string | null;
};

// Public organizer info ("Hosted by" and /organizers/[id]). Phone stays private.
export type PublicOrganizer = {
  id: string;
  name: string;
  logoUrl: string | null;
  description: string | null;
  website: string | null;
  city: string | null;
};

export type PublicCategory = {
  id: string;
  name: string;
  slug: string;
};

export type EventListFilters = {
  q: string;
  category: string; // category slug, "" for all
  region: string; // region filter id from lib/regions.ts, "" for all
  from: string; // ISO timestamp, "" for now
  to: string; // ISO timestamp, "" for no limit
  when: string; // preset label kept for the UI
  page: number;
};

export type HeroContentView = {
  title: string;
  subtitle: string;
  imageSrc: string | null;
  ctaText: string;
};

export type AnnouncementView = {
  text: string;
  enabled: boolean;
};
