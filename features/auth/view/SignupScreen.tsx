"use client";

import { SignupView } from "@/features/auth/view/SignupView";
import { useSignupViewModel } from "@/features/auth/viewmodel/useSignupViewModel";

export default function SignupScreen() {
  const viewModel = useSignupViewModel();
  return <SignupView {...viewModel} />;
}
