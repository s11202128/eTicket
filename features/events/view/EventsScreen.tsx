"use client";

import { AppShell } from "@/features/shell/view/AppShell";
import { EventsView } from "@/features/events/view/EventsView";
import { useEventsViewModel } from "@/features/events/viewmodel/useEventsViewModel";

function EventsContent() {
  const viewModel = useEventsViewModel();
  return <EventsView {...viewModel} />;
}

export default function EventsScreen() {
  return (
    <AppShell activeId="events">
      <EventsContent />
    </AppShell>
  );
}
