import type { Metadata } from "next";
import ApplicationScreen from "@/features/organizer/view/ApplicationScreen";

export const metadata: Metadata = { title: "Organizer application", robots: { index: false } };

// Sign-in is required by proxy.ts.
export default function OrganizerApplicationPage() {
  return <ApplicationScreen />;
}
