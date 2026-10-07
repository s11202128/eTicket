import type { Metadata } from "next";
import LogoutScreen from "@/features/auth/view/LogoutScreen";

export const metadata: Metadata = { title: "Log out", robots: { index: false } };

export default function LogoutPage() {
  return <LogoutScreen />;
}
