"use client";

import { ForgotPasswordView } from "@/features/auth/view/ForgotPasswordView";
import { useForgotPasswordViewModel } from "@/features/auth/viewmodel/useForgotPasswordViewModel";

export default function ForgotPasswordScreen() {
  const viewModel = useForgotPasswordViewModel();
  return <ForgotPasswordView {...viewModel} />;
}
