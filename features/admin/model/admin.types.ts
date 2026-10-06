import type { Event } from "@/features/dashboard/model/dashboard.types";

export type ManagedEvent = Event & {
  ticketsSold: number;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminOverview = {
  totalEvents: number;
  liveEvents: number;
  draftEvents: number;
  ticketsIssued: number;
  totalCapacity: number;
  occupancyRate: number;
};

export type AdminEventInput = {
  title: string;
  description: string;
  category: string;
  venue: string;
  location: string;
  startsAt: string;
  imageUrl: string;
  priceCents: number;
  currency: string;
  capacity: number;
  featured: boolean;
  published: boolean;
};

export type AdminSnapshot = {
  overview: AdminOverview;
  events: ManagedEvent[];
  updatedAt: string;
};
