import Image from "next/image";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import type { PublicEvent, PublicOrganizer } from "@/features/events/model/events.types";
import { EventGrid } from "@/features/events/view/EventPoster";

// Public organizer page: who they are and their upcoming events.
export function OrganizerPageScreen({ organizer, events }: { organizer: PublicOrganizer; events: PublicEvent[] }) {
  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-10 sm:px-6">
      <header className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-center">
        {organizer.logoUrl ? (
          <Image
            src={organizer.logoUrl}
            alt=""
            width={112}
            height={112}
            unoptimized
            className="size-28 rounded-2xl object-cover"
          />
        ) : (
          <span aria-hidden className="grid size-28 place-items-center rounded-2xl bg-accent text-5xl font-extrabold text-on-accent">
            {organizer.name.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="grid gap-2">
          <p className="text-xs font-bold uppercase tracking-wider text-accent-text">Event organizer</p>
          <h1 className="text-4xl font-extrabold tracking-tight">{organizer.name}</h1>
          <p className="text-muted">
            {organizer.city ? organizer.city : null}
            {organizer.city && organizer.website ? " · " : null}
            {organizer.website ? (
              <a
                href={organizer.website}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="font-semibold text-accent-text hover:underline"
              >
                {organizer.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
              </a>
            ) : null}
          </p>
        </div>
      </header>

      {organizer.description ? (
        <p className="max-w-prose whitespace-pre-line text-lg leading-relaxed text-muted">{organizer.description}</p>
      ) : null}

      <section aria-labelledby="organizer-events" className="grid gap-5">
        <h2 id="organizer-events" className="text-2xl font-extrabold tracking-tight">
          Upcoming events
        </h2>
        {events.length === 0 ? (
          <EmptyState
            icon="🎟"
            title="No upcoming events right now"
            description={`Check back soon for new events from ${organizer.name}.`}
            action={
              <ButtonLink href="/events" variant="secondary">
                Browse all events
              </ButtonLink>
            }
          />
        ) : (
          <EventGrid events={events} priorityCount={3} />
        )}
      </section>
    </div>
  );
}
