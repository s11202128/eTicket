import type { Metadata } from "next";
import ForgotPasswordScreen from "@/features/auth/view/ForgotPasswordScreen";

export const metadata: Metadata = { title: "Forgot password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return <ForgotPasswordScreen />;
}
