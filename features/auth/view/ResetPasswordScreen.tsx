"use client";

import { ResetPasswordView } from "@/features/auth/view/ResetPasswordView";
import { useResetPasswordViewModel } from "@/features/auth/viewmodel/useResetPasswordViewModel";

export default function ResetPasswordScreen() {
  const viewModel = useResetPasswordViewModel();
  return <ResetPasswordView {...viewModel} />;
}
