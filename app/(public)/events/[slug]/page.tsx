import { notFound, permanentRedirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { getPublicEvent } from "@/features/events/model/publicEvents.server";
import { EventDetailScreen } from "@/features/events/view/EventDetailScreen";

type Params = Promise<{ slug: string }>;

export default async function EventDetailPage({ params }: { params: Params }) {
  const { slug } = await params;
  const [event, viewer] = await Promise.all([getPublicEvent(slug), getViewer()]);

  if (!event) notFound();

  // Old links used the event id; send them to the slug URL.
  if (event.slug !== slug) permanentRedirect(`/events/${event.slug}`);

  return <EventDetailScreen event={event} isSignedIn={Boolean(viewer)} isAdmin={viewer?.role === "admin"} />;
}
