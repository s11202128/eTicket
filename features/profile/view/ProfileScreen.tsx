"use client";

import { AppShell } from "@/features/shell/view/AppShell";
import { ProfileView } from "@/features/profile/view/ProfileView";
import { useProfileViewModel } from "@/features/profile/viewmodel/useProfileViewModel";

function ProfileContent() {
  const viewModel = useProfileViewModel();
  return <ProfileView {...viewModel} />;
}

export default function ProfileScreen() {
  return (
    <AppShell activeId="profile">
      <ProfileContent />
    </AppShell>
  );
}
