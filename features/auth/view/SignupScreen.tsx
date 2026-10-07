"use client";

import { SignupView } from "@/features/auth/view/SignupView";
import { useSignupViewModel, type SignupType } from "@/features/auth/viewmodel/useSignupViewModel";

export default function SignupScreen({ initialType, next }: { initialType: SignupType | null; next: string | null }) {
  const viewModel = useSignupViewModel(initialType, next);
  return <SignupView {...viewModel} />;
}
