import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safeRedirect";
import { loginDestination, type LoginMode } from "@/lib/access";
import LoginScreen from "@/features/auth/view/LoginScreen";

export const metadata: Metadata = { title: "Log in" };

type SearchParams = Promise<{ next?: string; mode?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const [params, viewer] = await Promise.all([searchParams, getViewer()]);
  const mode: LoginMode = params.mode === "manager" ? "manager" : "book";
  const next = safeNextPath(params.next, "") || null;

  // Already signed in: continue to where they'd land after logging in.
  if (viewer) {
    const destination = loginDestination(
      { role: viewer.role, organizerStatus: viewer.organizerStatus, staffEventCount: viewer.isStaff ? 1 : 0 },
      mode,
      next
    );
    redirect(destination.kind === "redirect" ? destination.href : "/manager/application");
  }

  return <LoginScreen initialMode={mode} next={next} />;
}
