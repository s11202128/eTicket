"use client";

import { AppShell } from "@/features/shell/view/AppShell";
import { TicketsView } from "@/features/tickets/view/TicketsView";
import { useTicketsViewModel } from "@/features/tickets/viewmodel/useTicketsViewModel";

function TicketsContent() {
  const viewModel = useTicketsViewModel();
  return <TicketsView {...viewModel} />;
}

export default function TicketsScreen() {
  return (
    <AppShell activeId="tickets">
      <TicketsContent />
    </AppShell>
  );
}
