import type { Metadata } from "next";
import NotificationsAdminScreen from "@/features/admin/view/NotificationsAdminScreen";

export const metadata: Metadata = { title: "Notifications" };

export default function AdminNotificationsPage() {
  return <NotificationsAdminScreen />;
}
