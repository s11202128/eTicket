import type { Metadata } from "next";
import EventWizardScreen from "@/features/manager/view/EventWizardScreen";

export const metadata: Metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventWizardScreen eventId={id} />;
}
