import type { Metadata } from "next";
import CancellationRequestsScreen from "@/features/admin/view/CancellationRequestsScreen";

export const metadata: Metadata = { title: "Cancellation requests" };

export default function Page() {
  return <CancellationRequestsScreen />;
}
