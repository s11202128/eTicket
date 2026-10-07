import type { Metadata } from "next";
import OrganizersQueueScreen from "@/features/admin/view/OrganizersQueueScreen";

export const metadata: Metadata = { title: "Organizers" };

export default function Page() {
  return <OrganizersQueueScreen />;
}
