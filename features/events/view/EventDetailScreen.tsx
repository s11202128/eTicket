import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { formatPrice } from "@/lib/format";
import { REGION_LABELS } from "@/lib/regions";
import type { PublicEvent } from "@/features/events/model/events.types";
import { BookButton } from "@/features/events/view/BookButton";
import { AvailabilityBadge, canOptimize } from "@/features/events/view/EventPoster";

type EventDetailScreenProps = {
  event: PublicEvent;
  isSignedIn: boolean;
  isAdmin: boolean;
};

function unavailableReason(event: PublicEvent): string | null {
  if (event.status === "cancelled") return "Event cancelled";
  if (event.status !== "published") return "Not available";
  if (event.isPast) return "Event has started";
  if (event.isSoldOut) return "Sold out";
  return null;
}

export function EventDetailScreen({ event, isSignedIn, isAdmin }: EventDetailScreenProps) {
  const seats =
    event.capacity === null
      ? "Plenty of seats"
      : event.isSoldOut
        ? "Sold out"
        : `${event.spotsLeft} of ${event.capacity} seats left`;

  return (
    <article>
      <div className="relative isolate">
        <div className="relative aspect-[16/9] max-h-[560px] w-full overflow-hidden sm:aspect-[21/9]">
          <Image
            src={event.imageSrc}
            alt=""
            fill
            priority
            sizes="100vw"
            unoptimized={!canOptimize(event.imageSrc)}
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bg via-bg/30 to-transparent" />
        </div>
      </div>

      <div className="mx-auto -mt-24 grid max-w-6xl gap-8 px-4 pb-16 sm:px-6 lg:grid-cols-[1fr_360px]">
        <div className="relative grid content-start gap-5">
          <div className="flex flex-wrap gap-2">
            {event.categoryName && event.categorySlug ? (
              <Link
                href={`/events?category=${encodeURIComponent(event.categorySlug)}`}
                className="rounded-full bg-surface px-3 py-1 text-xs font-semibold hover:text-accent-text"
              >
                {event.categoryName}
              </Link>
            ) : null}
            {event.status === "cancelled" ? <Badge tone="danger">Cancelled</Badge> : <AvailabilityBadge event={event} />}
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">{event.title}</h1>

          {event.status === "cancelled" ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger-bg p-4 font-semibold text-danger">
              This event has been cancelled. Any tickets for it have been cancelled.
            </p>
          ) : null}

          {event.description ? (
            <div className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-muted">{event.description}</div>
          ) : (
            <p className="text-muted">More details coming soon.</p>
          )}
        </div>

        <aside className="relative grid content-start gap-5 rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-24">
          <dl className="grid gap-4">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">When</dt>
              <dd className="mt-1 font-semibold">
                <LocalDateTime iso={event.startsAt} format="weekdayDate" />
                <br />
                <LocalDateTime iso={event.startsAt} format="time" />
                {event.endAt ? (
                  <>
                    {" – "}
                    <LocalDateTime iso={event.endAt} format="time" />
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">Where</dt>
              <dd className="mt-1 font-semibold">{event.location}</dd>
              <dd className="text-sm text-muted">{REGION_LABELS[event.region]}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wider text-muted">Seats</dt>
              <dd className="mt-1 font-semibold">{seats}</dd>
            </div>
          </dl>

          <div className="border-t border-border pt-5">
            <p className="text-3xl font-extrabold">{formatPrice(event.price)}</p>
            <p className="mb-4 text-xs text-muted">Up to {event.maxTicketsPerUser} tickets per person</p>
            <BookButton
              eventId={event.id}
              slug={event.slug}
              isSignedIn={isSignedIn}
              unavailableReason={unavailableReason(event)}
            />
          </div>

          {isAdmin ? (
            <Link href={`/admin/events/${event.id}/edit`} className="text-center text-sm font-semibold text-accent-text hover:underline">
              Manage in admin
            </Link>
          ) : null}
        </aside>
      </div>
    </article>
  );
}
