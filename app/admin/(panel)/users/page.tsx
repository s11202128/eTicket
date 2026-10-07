import type { Metadata } from "next";
import UsersScreen from "@/features/admin/view/UsersScreen";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsersPage() {
  return <UsersScreen />;
}
