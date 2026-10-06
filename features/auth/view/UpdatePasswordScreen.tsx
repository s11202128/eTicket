"use client";

import { UpdatePasswordView } from "./UpdatePasswordView";
import { useUpdatePasswordViewModel } from "@/features/auth/viewmodel/useUpdatePasswordViewModel";

export default function UpdatePasswordScreen() {
  return <UpdatePasswordView {...useUpdatePasswordViewModel()} />;
}
