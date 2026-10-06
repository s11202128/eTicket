import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/cn";
import type { EventListFilters, PublicCategory, PublicEvent } from "@/features/events/model/events.types";
import { EventFilters } from "@/features/events/view/EventFilters";
import { EventGrid } from "@/features/events/view/EventPoster";

type EventsListScreenProps = {
  events: PublicEvent[];
  total: number;
  pageSize: number;
  filters: EventListFilters;
  categories: PublicCategory[];
};

function pageHref(filters: EventListFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.when) params.set("when", filters.when);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/events?${query}` : "/events";
}

export function EventsListScreen({ events, total, pageSize, filters, categories }: EventsListScreenProps) {
  const pages = Math.max(Math.ceil(total / pageSize), 1);
  const hasFilters = Boolean(filters.q || filters.category || filters.when);
  const categoryName = categories.find((item) => item.slug === filters.category)?.name;

  return (
    <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{categoryName ? `${categoryName} events` : "All events"}</h1>
        <p className="mt-1 text-muted" aria-live="polite">
          {total} upcoming event{total === 1 ? "" : "s"}
          {hasFilters ? " match your filters" : ""}
        </p>
      </div>

      <EventFilters categories={categories} initial={{ q: filters.q, category: filters.category, when: filters.when }} />

      {events.length === 0 ? (
        <EmptyState
          icon="🔍"
          title={hasFilters ? "No events match your search" : "No upcoming events yet"}
          description={hasFilters ? "Try another date, category or search term." : "New events are added regularly. Check back soon."}
          action={hasFilters ? <ButtonLink href="/events" variant="secondary">Clear filters</ButtonLink> : undefined}
        />
      ) : (
        <EventGrid events={events} priorityCount={3} />
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
          <Link
            href={pageHref(filters, filters.page - 1)}
            aria-disabled={filters.page <= 1}
            className={cn(
              "rounded-md border border-border px-4 py-2 text-sm font-semibold",
              filters.page <= 1 ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
            )}
          >
            Previous
          </Link>
          <span className="px-2 text-sm text-muted">
            Page {filters.page} of {pages}
          </span>
          <Link
            href={pageHref(filters, filters.page + 1)}
            aria-disabled={filters.page >= pages}
            className={cn(
              "rounded-md border border-border px-4 py-2 text-sm font-semibold",
              filters.page >= pages ? "pointer-events-none opacity-40" : "hover:bg-surface-2"
            )}
          >
            Next
          </Link>
        </nav>
      ) : null}
    </div>
  );
}
