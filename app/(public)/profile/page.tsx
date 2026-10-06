import type { Metadata } from "next";
import { requireViewer } from "@/lib/requireViewer";
import ProfileScreen from "@/features/profile/view/ProfileScreen";

export const metadata: Metadata = { title: "Profile", robots: { index: false } };

export default async function ProfilePage() {
  await requireViewer("/profile");
  return <ProfileScreen />;
}
