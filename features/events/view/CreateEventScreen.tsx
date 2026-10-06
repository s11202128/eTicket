"use client";

import { CreateEventView } from "@/features/events/view/CreateEventView";
import { useCreateEventViewModel } from "@/features/events/viewmodel/useCreateEventViewModel";

export default function CreateEventScreen() {
  const viewModel = useCreateEventViewModel();
  return <CreateEventView {...viewModel} />;
}
