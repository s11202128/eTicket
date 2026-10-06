import type { Metadata } from "next";
import SignupScreen from "@/features/auth/view/SignupScreen";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

export default function SignupPage() {
  return <SignupScreen />;
}
