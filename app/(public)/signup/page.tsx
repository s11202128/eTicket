import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safeRedirect";
import SignupScreen from "@/features/auth/view/SignupScreen";

export const metadata: Metadata = { title: "Sign up", robots: { index: false } };

type SearchParams = Promise<{ type?: string; next?: string }>;

export default async function SignupPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, viewer] = await Promise.all([searchParams, getViewer()]);
  const type = params.type === "organizer" ? "organizer" : params.type === "attendee" ? "attendee" : null;

  // Signed-in users already have an account: organizers-to-be apply from
  // their application page (same form), everyone else goes home.
  if (viewer) {
    if (type !== "organizer") redirect("/");
    redirect(viewer.organizerStatus === "approved" ? "/manager" : "/manager/application");
  }

  return <SignupScreen initialType={type} next={safeNextPath(params.next, "") || null} />;
}
