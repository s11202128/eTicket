import type { Metadata } from "next";
import EventReviewScreen from "@/features/admin/view/EventReviewScreen";

export const metadata: Metadata = { title: "Review event" };

export default async function ReviewEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventReviewScreen eventId={id} />;
}
