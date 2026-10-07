import type { Metadata } from "next";
import ResetPasswordScreen from "@/features/auth/view/ResetPasswordScreen";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return <ResetPasswordScreen />;
}
