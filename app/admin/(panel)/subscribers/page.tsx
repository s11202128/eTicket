import type { Metadata } from "next";
import SubscribersScreen from "@/features/admin/view/SubscribersScreen";

export const metadata: Metadata = { title: "Subscribers" };

export default function Page() {
  return <SubscribersScreen />;
}
