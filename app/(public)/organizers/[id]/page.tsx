import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { excerpt } from "@/lib/site";
import { getPublicOrganizer, listOrganizerEvents } from "@/features/events/model/publicEvents.server";
import { OrganizerPageScreen } from "@/features/events/view/OrganizerPageScreen";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  const organizer = await getPublicOrganizer(id);
  if (!organizer) return { title: "Organizer not found", robots: { index: false } };
  return {
    title: organizer.name,
    description: excerpt(organizer.description) || `Upcoming events from ${organizer.name} on E-Ticket.`,
    alternates: { canonical: `/organizers/${organizer.id}` },
  };
}

export default async function OrganizerPage({ params }: { params: Params }) {
  const { id } = await params;
  const organizer = await getPublicOrganizer(id);
  if (!organizer) notFound();
  const events = await listOrganizerEvents(organizer.id);
  return <OrganizerPageScreen organizer={organizer} events={events} />;
}
