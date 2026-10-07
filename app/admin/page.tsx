import type { Metadata } from "next";
import OverviewScreen from "@/features/admin/view/OverviewScreen";

export const metadata: Metadata = { title: "Overview" };

export default function AdminOverviewPage() {
  return <OverviewScreen />;
}
