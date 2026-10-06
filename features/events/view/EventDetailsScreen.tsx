"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/features/shell/view/AppShell";
import { EventDetailsView } from "@/features/events/view/EventDetailsView";
import { useEventDetailsViewModel } from "@/features/events/viewmodel/useEventDetailsViewModel";

function EventDetailsContent({ eventId }: { eventId: string }) {
  const viewModel = useEventDetailsViewModel(eventId);
  return <EventDetailsView {...viewModel} />;
}

export default function EventDetailsScreen() {
  const { id } = useParams<{ id: string }>();

  return (
    <AppShell activeId="events">
      <EventDetailsContent eventId={id} />
    </AppShell>
  );
}
