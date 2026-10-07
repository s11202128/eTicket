import type { Metadata } from "next";
import ReviewQueueScreen from "@/features/admin/view/ReviewQueueScreen";

export const metadata: Metadata = { title: "Event reviews" };

export default function Page() {
  return <ReviewQueueScreen />;
}
