import { redirect } from "next/navigation";

const NOTICES = new Set(["not-authorized"]);

// Temporary until the public homepage is built (Phase 3): send visitors to
// their dashboard (which asks signed-out visitors to log in), keeping any notice.
export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const { notice } = await searchParams;
  redirect(notice && NOTICES.has(notice) ? `/dashboard?notice=${notice}` : "/dashboard");
}
