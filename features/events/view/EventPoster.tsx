import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { formatPrice } from "@/lib/format";
import type { PublicEvent } from "@/features/events/model/events.types";

const LOW_STOCK = 10;

// Only optimise images from hosts allowed in next.config.ts.
export function canOptimize(src: string): boolean {
  try {
    const host = new URL(src).hostname;
    return host === "images.unsplash.com" || host.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

export function AvailabilityBadge({ event }: { event: PublicEvent }) {
  if (event.isPast) return <Badge tone="neutral">Event ended</Badge>;
  if (event.isSoldOut) return <Badge tone="danger">Sold out</Badge>;
  if (event.spotsLeft !== null && event.spotsLeft <= LOW_STOCK) {
    return <Badge tone="accent">Only {event.spotsLeft} left</Badge>;
  }
  return null;
}

// Poster-style card used on the homepage and the events list.
export function EventPoster({ event, priority = false }: { event: PublicEvent; priority?: boolean }) {
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-muted">
      <div className="relative aspect-[3/2] overflow-hidden">
        <Image
          src={event.imageSrc}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          priority={priority}
          unoptimized={!canOptimize(event.imageSrc)}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {event.categoryName ? (
            <span className="rounded-full bg-bg/85 px-2.5 py-0.5 text-xs font-semibold text-fg backdrop-blur">
              {event.categoryName}
            </span>
          ) : null}
          <AvailabilityBadge event={event} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-text">
          <LocalDateTime iso={event.startsAt} format="dateTime" />
        </p>
        <h3 className="text-lg font-extrabold leading-snug">
          {/* The whole card is clickable via this link's ::after overlay. */}
          <Link href={`/events/${event.slug}`} className="after:absolute after:inset-0 focus-visible:outline-none">
            {event.title}
          </Link>
        </h3>
        <p className="truncate text-sm text-muted">{event.location}</p>
        <p className="mt-auto pt-2 text-base font-bold">{formatPrice(event.price)}</p>
      </div>
    </article>
  );
}

export function EventGrid({ events, priorityCount = 0 }: { events: PublicEvent[]; priorityCount?: number }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {events.map((event, index) => (
        <li key={event.id} className="grid focus-within:rounded-xl focus-within:ring-2 focus-within:ring-ring">
          <EventPoster event={event} priority={index < priorityCount} />
        </li>
      ))}
    </ul>
  );
}
