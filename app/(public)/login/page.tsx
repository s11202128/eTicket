import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/safeRedirect";
import LoginScreen from "@/features/auth/view/LoginScreen";

export const metadata: Metadata = { title: "Log in" };

type SearchParams = Promise<{ next?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const [{ next }, viewer] = await Promise.all([searchParams, getViewer()]);
  // Already signed in: continue to where they were going.
  if (viewer) redirect(safeNextPath(next, "/"));
  return <LoginScreen />;
}
