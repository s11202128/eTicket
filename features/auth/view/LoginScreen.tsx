"use client";

import { LoginView } from "@/features/auth/view/LoginView";
import { useLoginViewModel } from "@/features/auth/viewmodel/useLoginViewModel";

export default function LoginScreen() {
  const viewModel = useLoginViewModel();
  return <LoginView {...viewModel} />;
}
