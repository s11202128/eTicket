import type { Metadata } from "next";
import TeamScreen from "@/features/manager/view/TeamScreen";

export const metadata: Metadata = { title: "Team" };

export default async function ManagerTeamPage({ searchParams }: { searchParams: Promise<{ event?: string }> }) {
  const { event } = await searchParams;
  return <TeamScreen initialEventId={event ?? null} />;
}
