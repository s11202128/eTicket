"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/features/shell/view/AppShell";
import { TicketDetailsView } from "@/features/tickets/view/TicketDetailsView";
import { useTicketDetailsViewModel } from "@/features/tickets/viewmodel/useTicketDetailsViewModel";

function TicketDetailsContent({ ticketId }: { ticketId: string }) {
  const viewModel = useTicketDetailsViewModel(ticketId);
  return <TicketDetailsView {...viewModel} />;
}

export default function TicketDetailsScreen() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell activeId="tickets">
      <TicketDetailsContent ticketId={id} />
    </AppShell>
  );
}
