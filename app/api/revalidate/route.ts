import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { getViewer } from "@/lib/supabase/server";
import { PUBLIC_CACHE_TAG } from "@/lib/publicCache";

// Public pages are cached (see app/(public)/layout.tsx). Admins and approved
// organizers change events from the browser, so after a change the browser
// calls this to refresh every public page now instead of within a minute.
// Only refreshes caches: it reads and changes no data.
export async function POST() {
  // The admin area has its own session cookie; organizers use the public one.
  const [admin, viewer] = await Promise.all([getViewer("admin"), getViewer("public")]);
  const allowed =
    admin?.role === "admin" || viewer?.role === "admin" || viewer?.organizerStatus === "approved";
  if (!allowed) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  // Pages (home, event and organizer pages) and the cached /events data.
  revalidatePath("/", "layout");
  revalidateTag(PUBLIC_CACHE_TAG, { expire: 0 });
  return NextResponse.json({ revalidated: true });
}
