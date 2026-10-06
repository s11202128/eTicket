import type { Metadata } from "next";
import { requireViewer } from "@/lib/requireViewer";
import TicketDetailScreen from "@/features/tickets/view/TicketDetailScreen";

export const metadata: Metadata = { title: "Your ticket", robots: { index: false } };

type Params = Promise<{ code: string }>;

export default async function TicketPage({ params }: { params: Params }) {
  const { code } = await params;
  const viewer = await requireViewer(`/tickets/${code}`);
  return <TicketDetailScreen code={code} holderName={viewer.fullName || viewer.email || "Ticket holder"} />;
}
