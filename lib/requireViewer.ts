import { redirect } from "next/navigation";
import { getViewer, type ViewerProfile } from "@/lib/supabase/server";

// For signed-in-only pages: redirect to login (and back here afterwards).
export async function requireViewer(returnTo: string): Promise<ViewerProfile> {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(returnTo)}`);
  return viewer;
}
