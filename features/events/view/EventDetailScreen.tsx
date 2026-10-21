import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Markdown } from "@/components/ui/Markdown";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { formatPrice } from "@/lib/format";
import { REGION_LABELS } from "@/lib/regions";
import type { PublicEvent, PublicOrganizer } from "@/features/events/model/events.types";
import { typeAvailability, type PublicTicketType } from "@/features/events/model/ticketAvailability";
import type { PublicAddon } from "@/features/events/model/addonAvailability";
import { AvailabilityBadge, canOptimize } from "@/features/events/view/EventPoster";
import { TicketSelector } from "@/features/events/view/TicketSelector";
import { DEFAULT_PAYMENT_SETTINGS, type PaymentSettings } from "@/features/payments/model/payments.types";

type EventDetailScreenProps = {
  event: PublicEvent;
  ticketTypes: PublicTicketType[];
  // Extras sold with tickets (parking, merch, ...).
  addons?: PublicAddon[];
  // The organizer hosting the event (null for platform events).
  host: PublicOrganizer | null;
  // Service fee and test/live mode for the booking total.
  payment?: PaymentSettings;
  // Organizer preview: same page, booking disabled.
  preview?: boolean;
};

function unavailableReason(event: PublicEvent): string | null {
  if (event.status === "cancelled") return "Event cancelled";
  if (event.status === "completed") return "Event has ended";
  if (event.status !== "published") return "Not available";
  if (event.isPast) return "Event has started";
  if (event.isSoldOut) return "Sold out";
  return null;
}

export function EventDetailScreen({
  event,
  ticketTypes,
  addons = [],
  host,
  payment = DEFAULT_PAYMENT_SETTINGS,
  preview = false,
}: EventDetailScreenProps) {
  const seats =
    event.capacity === null
      ? "Plenty of seats"
      : event.isSoldOut
        ? "Sold out"
        : `${event.spotsLeft} of ${event.capacity} seats left`;

  // Phones: a bar pinned to the bottom jumps to the booking panel below the description.
  const onSale = ticketTypes.filter((type) => typeAvailability(type, new Date()).state === "on_sale");
  const showBookBar = !preview && !unavailableReason(event) && onSale.length > 0;

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

      <div className={`mx-auto -mt-24 grid max-w-6xl gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:pb-16 ${showBookBar ? "pb-28" : "pb-16"}`}>
        <div className="relative grid min-w-0 content-start gap-5">
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
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight break-words sm:text-5xl">{event.title}</h1>

          {host ? (
            <Link
              href={`/organizers/${host.id}`}
              className={`flex w-fit items-center gap-3 rounded-full border border-border bg-surface py-1.5 pl-1.5 pr-4 hover:border-muted${preview ? " pointer-events-none" : ""}`}
            >
              {host.logoUrl ? (
                <Image src={host.logoUrl} alt="" width={32} height={32} unoptimized className="size-8 rounded-full object-cover" />
              ) : (
                <span aria-hidden className="grid size-8 place-items-center rounded-full bg-accent text-sm font-bold text-on-accent">
                  {host.name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="text-sm">
                <span className="text-muted">Hosted by </span>
                <span className="font-semibold">{host.name}</span>
              </span>
            </Link>
          ) : null}

          {!preview && !["published", "completed", "cancelled"].includes(event.status) ? (
            <p role="status" className="rounded-lg border border-warning/40 bg-warning-bg p-4 font-semibold text-warning">
              Only you can see this page: the event isn&apos;t public yet.
            </p>
          ) : null}

          {event.status === "cancelled" ? (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger-bg p-4 font-semibold text-danger">
              This event has been cancelled. Any tickets for it have been cancelled.
            </p>
          ) : null}

          {event.description ? (
            <Markdown source={event.description} className="max-w-prose break-words text-base leading-relaxed text-muted sm:text-lg" />
          ) : (
            <p className="text-muted">More details coming soon.</p>
          )}
        </div>

        <aside id="book" className="relative grid scroll-mt-20 content-start gap-5 rounded-xl border border-border bg-surface p-5 sm:p-6 lg:sticky lg:top-24">
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
            <TicketSelector
              types={ticketTypes}
              addons={addons}
              perPerson={event.maxTicketsPerUser}
              eventId={event.id}
              slug={event.slug}
              unavailableReason={unavailableReason(event)}
              payment={payment}
              preview={preview}
            />
          </div>

        </aside>
      </div>

      {showBookBar ? (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-bg/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
            <p className="text-sm text-muted">
              From <span className="text-lg font-extrabold text-fg tabular-nums">{formatPrice(Math.min(...onSale.map((type) => type.price)))}</span>
            </p>
            <a href="#book" className={buttonClasses("primary", "lg")}>
              Get tickets
            </a>
          </div>
        </div>
      ) : null}
    </article>
  );
}
