import type { Metadata } from "next";
import OrganizationScreen from "@/features/manager/view/OrganizationScreen";

export const metadata: Metadata = { title: "Organization profile" };

export default function Page() {
  return <OrganizationScreen />;
}
