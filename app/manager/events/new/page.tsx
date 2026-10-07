import type { Metadata } from "next";
import EventWizardScreen from "@/features/manager/view/EventWizardScreen";

export const metadata: Metadata = { title: "Create event" };

export default function NewEventPage() {
  return <EventWizardScreen eventId={null} />;
}
