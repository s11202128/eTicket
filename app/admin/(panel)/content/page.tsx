import type { Metadata } from "next";
import ContentScreen from "@/features/admin/view/ContentScreen";

export const metadata: Metadata = { title: "Content" };

export default function AdminContentPage() {
  return <ContentScreen />;
}
