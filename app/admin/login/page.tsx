import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safeRedirect";
import AdminLoginScreen from "@/features/admin/view/AdminLoginScreen";

export const metadata: Metadata = { title: "Admin login", robots: { index: false, follow: false } };

// The only way into /admin. Not linked from the public site.
export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const [params, viewer] = await Promise.all([searchParams, getViewer("admin")]);
  const next = safeNextPath(params.next, "");
  const destination = next.startsWith("/admin") && next !== "/admin/login" ? next : "/admin";
  // Already signed in as an authorized admin.
  if (viewer?.role === "admin") redirect(destination);
  return <AdminLoginScreen next={destination} />;
}
