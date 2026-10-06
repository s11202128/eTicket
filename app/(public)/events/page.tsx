import type { Metadata } from "next";
import {
  EVENTS_PAGE_SIZE,
  listCategories,
  listPublicEvents,
} from "@/features/events/model/publicEvents.server";
import type { EventListFilters } from "@/features/events/model/events.types";
import { EventsListScreen } from "@/features/events/view/EventsListScreen";

export const metadata: Metadata = {
  title: "Events",
  description: "Browse upcoming concerts, sports, festivals and more.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function isoOrEmpty(value: string): string {
  return value && !Number.isNaN(Date.parse(value)) ? new Date(value).toISOString() : "";
}

export default async function EventsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const page = Number.parseInt(one(params.page), 10);
  const filters: EventListFilters = {
    q: one(params.q).slice(0, 100),
    category: one(params.category).slice(0, 60),
    when: one(params.when).slice(0, 20),
    from: isoOrEmpty(one(params.from)),
    to: isoOrEmpty(one(params.to)),
    page: Number.isFinite(page) && page > 0 ? page : 1,
  };

  const [{ events, total }, categories] = await Promise.all([listPublicEvents(filters), listCategories()]);

  return (
    <EventsListScreen
      events={events}
      total={total}
      pageSize={EVENTS_PAGE_SIZE}
      filters={filters}
      categories={categories}
    />
  );
}
