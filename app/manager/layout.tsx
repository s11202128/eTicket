import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServerClient, getViewer } from "@/lib/supabase/server";
import { ManagerShell } from "@/features/manager/view/ManagerShell";

export const metadata: Metadata = {
  title: { default: "Event Manager", template: "%s · Event Manager · E-Ticket" },
  robots: { index: false, follow: false },
};

const logoUrl = (path: string) =>
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/organizer-logos/${path}`;

// proxy.ts decides who may open each /manager page (approved organizers;
// door staff and admins for check-in). This is the second line of defence.
export default async function ManagerLayout({ children }: { children: ReactNode }) {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?mode=manager&next=/manager");

  const isOrganizer = viewer.organizerStatus === "approved";
  if (!isOrganizer && !viewer.isStaff && viewer.role !== "admin") redirect("/manager/application");

  let organizationName = viewer.fullName || viewer.email || "Event Manager";
  let logo: string | null = null;
  if (viewer.organizerStatus) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("organizer_profiles")
      .select("organization_name, logo_path")
      .eq("user_id", viewer.id)
      .maybeSingle();
    if (data) {
      organizationName = data.organization_name;
      logo = data.logo_path ? logoUrl(data.logo_path) : null;
    }
  }

  return (
    <ManagerShell organizationName={organizationName} logoUrl={logo} isOrganizer={isOrganizer}>
      {children}
    </ManagerShell>
  );
}
