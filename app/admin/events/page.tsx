import type { Metadata } from "next";
import EventsAdminScreen from "@/features/admin/view/EventsAdminScreen";

export const metadata: Metadata = { title: "Events" };

export default function AdminEventsPage() {
  return <EventsAdminScreen />;
}
