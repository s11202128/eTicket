"use client";

import type { LoginMode } from "@/lib/access";
import { LoginView } from "@/features/auth/view/LoginView";
import { useLoginViewModel } from "@/features/auth/viewmodel/useLoginViewModel";

export default function LoginScreen({ initialMode, next }: { initialMode: LoginMode; next: string | null }) {
  const viewModel = useLoginViewModel(initialMode, next);
  return <LoginView {...viewModel} />;
}
