import type { Metadata } from "next";
import { requireViewer } from "@/lib/requireViewer";
import MyTicketsScreen from "@/features/tickets/view/MyTicketsScreen";

export const metadata: Metadata = { title: "My tickets", robots: { index: false } };

export default async function TicketsPage() {
  await requireViewer("/tickets");
  return <MyTicketsScreen />;
}
