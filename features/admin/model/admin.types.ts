import type { EventRegion, EventStatus, TicketDbStatus, UserRole } from "@/lib/database.types";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; errorMessage: string };

export type Paged<T> = {
  rows: T[];
  total: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  sortOrder: number;
  eventCount?: number;
};

export type AdminEventRow = {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  startsAt: string;
  endAt: string | null;
  location: string;
  price: number;
  capacity: number | null;
  sold: number;
  isFeatured: boolean;
  categoryId: string | null;
  categoryName: string | null;
  region: EventRegion;
  imageSrc: string;
};

export type AdminEventFilters = {
  search: string;
  status: EventStatus | "all";
  categoryId: string | "all";
  from: string; // yyyy-mm-dd, local
  to: string;
  page: number;
};

export type BookingRow = {
  id: string;
  code: string;
  status: TicketDbStatus;
  createdAt: string;
  checkedInAt: string | null;
  eventId: string;
  eventTitle: string;
  eventStartsAt: string;
  holderName: string | null;
  holderEmail: string | null;
};

export type BookingFilters = {
  search: string;
  status: TicketDbStatus | "all";
  eventId: string | "all";
  page: number;
};

export type AdminUserRow = {
  id: string;
  email: string | null;
  fullName: string | null;
  role: UserRole;
  createdAt: string;
  // Email is on the authorized admin list (only these can be made admin).
  canBeAdmin: boolean;
};

export type AdminStats = {
  ticketsToday: number;
  ticketsThisWeek: number;
  upcomingEvents: number;
  eventsNearCapacity: number;
  totalUsers: number;
};

export type NearCapacityEvent = {
  eventId: string;
  title: string;
  slug: string;
  startsAt: string;
  capacity: number;
  sold: number;
};

export type HeroContent = {
  title: string;
  subtitle: string;
  imagePath: string | null;
  ctaText: string;
};

export type AnnouncementContent = {
  text: string;
  enabled: boolean;
};

export type EventOption = {
  id: string;
  title: string;
  startsAt: string;
  status: EventStatus;
};

export type SentNotification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  createdAt: string;
};
