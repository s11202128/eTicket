import type { Metadata } from "next";
import CategoriesScreen from "@/features/admin/view/CategoriesScreen";

export const metadata: Metadata = { title: "Categories" };

export default function AdminCategoriesPage() {
  return <CategoriesScreen />;
}
