import type { Metadata } from "next";
import EventEditorScreen from "@/features/admin/view/EventEditorScreen";

export const metadata: Metadata = { title: "Edit event" };

export default function AdminEditEventPage() {
  return <EventEditorScreen />;
}
