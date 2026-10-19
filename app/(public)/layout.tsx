import type { ReactNode } from "react";
import { Suspense } from "react";
import { getSiteChrome } from "@/features/events/model/publicEvents.server";
import { AnnouncementBar } from "@/features/site/view/AnnouncementBar";
import { NoticeBanner } from "@/features/site/view/NoticeBanner";
import { SiteFooter } from "@/features/site/view/SiteFooter";
import { SiteHeader } from "@/features/site/view/SiteHeader";

// Public pages are cached and refreshed at least every 60 seconds (sooner
// after an admin or organizer change; see app/api/revalidate). Nothing here
// may read cookies: the signed-in parts (header, booking panel) load in the
// browser. Keep in sync with PUBLIC_REVALIDATE_SECONDS (lib/publicCache.ts).
export const revalidate = 60;

// Dark "event poster" theme for everything visitors see.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  // The site still works if the announcement can't be loaded.
  const chrome = await getSiteChrome().catch(() => ({ announcement: { text: "", enabled: false } }));

  return (
    <div className="theme-public flex min-h-dvh flex-col bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <AnnouncementBar announcement={chrome.announcement} />
      <SiteHeader />
      <Suspense fallback={null}>
        <NoticeBanner />
      </Suspense>
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
