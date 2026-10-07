import type { Metadata } from "next";
import EventEditorScreen from "@/features/admin/view/EventEditorScreen";

export const metadata: Metadata = { title: "New event" };

export default function AdminNewEventPage() {
  return <EventEditorScreen />;
}
