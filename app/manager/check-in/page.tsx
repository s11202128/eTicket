import type { Metadata } from "next";
import ManagerCheckInScreen from "@/features/manager/view/ManagerCheckInScreen";

export const metadata: Metadata = { title: "Check-in" };

export default async function ManagerCheckInPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  return <ManagerCheckInScreen initialEventId={event ?? null} />;
}
