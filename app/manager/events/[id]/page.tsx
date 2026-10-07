import type { Metadata } from "next";
import ManagerEventScreen from "@/features/manager/view/ManagerEventScreen";

export const metadata: Metadata = { title: "Event" };

export default async function ManagerEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ManagerEventScreen eventId={id} />;
}
