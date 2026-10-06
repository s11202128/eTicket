"use client";

import { useParams } from "next/navigation";
import { AppShell } from "@/features/shell/view/AppShell";
import { EventFormView } from "@/features/events/view/EventFormView";
import { useEventFormViewModel } from "@/features/events/viewmodel/useEventFormViewModel";

function EventFormContent({ eventId }: { eventId?: string }) {
  const viewModel = useEventFormViewModel(eventId);
  return <EventFormView {...viewModel} />;
}

// Used by /events/new (create) and /events/[id]/edit (edit).
export default function EventFormScreen() {
  const params = useParams<{ id?: string }>();
  const eventId = params.id;

  return (
    <AppShell activeId={eventId ? "events" : "create-event"}>
      <EventFormContent eventId={eventId} />
    </AppShell>
  );
}
