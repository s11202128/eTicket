import type { Metadata } from "next";
import MyEventsScreen from "@/features/manager/view/MyEventsScreen";

export const metadata: Metadata = { title: "My Events" };

export default function Page() {
  return <MyEventsScreen />;
}
