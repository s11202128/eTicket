"use client";

import { AppShell } from "@/features/shell/view/AppShell";
import { CheckInView } from "@/features/tickets/view/CheckInView";
import { useCheckInViewModel } from "@/features/tickets/viewmodel/useCheckInViewModel";

function CheckInContent() {
  const viewModel = useCheckInViewModel();
  return <CheckInView {...viewModel} />;
}

export default function CheckInScreen() {
  return (
    <AppShell activeId="check-in">
      <CheckInContent />
    </AppShell>
  );
}
