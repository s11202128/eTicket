import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { AdminShell } from "@/features/admin/view/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · E-Ticket" },
  robots: { index: false, follow: false },
};

// Second line of defence after proxy.ts: only staff and admins get the
// admin shell. The proxy decides which admin pages staff may open.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();

  if (!viewer) {
    redirect("/login?next=/admin");
  }

  if (viewer.role !== "admin" && viewer.role !== "staff") {
    redirect("/?notice=not-authorized");
  }

  return (
    <AdminShell role={viewer.role} name={viewer.fullName || viewer.email || "Admin"}>
      {children}
    </AdminShell>
  );
}
