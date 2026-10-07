import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getViewer } from "@/lib/supabase/server";
import { AdminShell } from "@/features/admin/view/AdminShell";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Admin · E-Ticket" },
  robots: { index: false, follow: false },
};

// Second line of defence after proxy.ts: only admins get the admin shell.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer("admin");

  if (!viewer) {
    redirect("/admin/login");
  }

  if (viewer.role !== "admin") {
    redirect("/?notice=not-authorized");
  }

  const supabase = await createSupabaseServerClient("admin");
  const { data: counts } = await supabase.rpc("admin_queue_counts");
  const badges = {
    organizers: counts?.[0]?.pending_organizers ?? 0,
    reviews: counts?.[0]?.pending_events ?? 0,
    cancellations: counts?.[0]?.cancellation_requests ?? 0,
  };

  return (
    <AdminShell name={viewer.fullName || viewer.email || "Admin"} badges={badges}>
      {children}
    </AdminShell>
  );
}
