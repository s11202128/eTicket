import type { Metadata } from "next";
import OverviewScreen from "@/features/manager/view/OverviewScreen";

export const metadata: Metadata = { title: "Overview" };

export default function Page() {
  return <OverviewScreen />;
}
