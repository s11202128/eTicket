import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { excerpt, formatInSiteZone, siteUrl } from "@/lib/site";
import { getPublicEvent } from "@/features/events/model/publicEvents.server";
import type { PublicEvent } from "@/features/events/model/events.types";
import { EventDetailScreen } from "@/features/events/view/EventDetailScreen";

type Params = Promise<{ slug: string }>;

function summary(event: PublicEvent): string {
  const when = formatInSiteZone(event.startsAt, { weekday: "short", day: "numeric", month: "short", year: "numeric" });
  return excerpt(event.description) || `${when} at ${event.location}. Book your tickets on E-Ticket.`;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicEvent(slug);
  if (!event) return { title: "Event not found", robots: { index: false } };

  const description = summary(event);
  const url = `/events/${event.slug}`;
  // The Open Graph image comes from ./opengraph-image.tsx automatically.
  return {
    title: event.title,
    description,
    alternates: { canonical: url },
    robots: event.status === "published" ? undefined : { index: false },
    openGraph: { type: "website", url, title: event.title, description },
    twitter: { card: "summary_large_image", title: event.title, description },
  };
}

// schema.org Event structured data for search results.
function eventJsonLd(event: PublicEvent): string {
  const data = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: excerpt(event.description, 500) || undefined,
    startDate: event.startsAt,
    endDate: event.endAt ?? undefined,
    eventStatus:
      event.status === "cancelled" ? "https://schema.org/EventCancelled" : "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: { "@type": "Place", name: event.location, address: event.location },
    image: [event.imageSrc],
    url: `${siteUrl()}/events/${event.slug}`,
    offers: {
      "@type": "Offer",
      price: event.price,
      priceCurrency: "USD",
      availability: event.isSoldOut ? "https://schema.org/SoldOut" : "https://schema.org/InStock",
      url: `${siteUrl()}/events/${event.slug}`,
    },
  };
  // Escape "<" so event text can't close the script tag (XSS).
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [event, viewer] = await Promise.all([getPublicEvent(slug), getViewer()]);

  if (!event) notFound();

  // Old links used the event id; send them to the slug URL.
  if (event.slug !== slug) permanentRedirect(`/events/${event.slug}`);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: eventJsonLd(event) }} />
      <EventDetailScreen event={event} isSignedIn={Boolean(viewer)} isAdmin={viewer?.role === "admin"} />
    </>
  );
}
