import type { Metadata } from "next";
import AuditLogScreen from "@/features/admin/view/AuditLogScreen";

export const metadata: Metadata = { title: "Audit log" };

export default function Page() {
  return <AuditLogScreen />;
}
