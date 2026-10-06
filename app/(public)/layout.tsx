import type { ReactNode } from "react";
import { Suspense } from "react";
import { getViewer } from "@/lib/supabase/server";
import { getSiteChrome } from "@/features/events/model/publicEvents.server";
import { AnnouncementBar } from "@/features/site/view/AnnouncementBar";
import { NoticeBanner } from "@/features/site/view/NoticeBanner";
import { SiteFooter } from "@/features/site/view/SiteFooter";
import { SiteHeader } from "@/features/site/view/SiteHeader";

// Dark "event poster" theme for everything visitors see.
export default async function PublicLayout({ children }: { children: ReactNode }) {
  const [viewer, chrome] = await Promise.all([
    getViewer(),
    // The site still works if the announcement can't be loaded.
    getSiteChrome().catch(() => ({ announcement: { text: "", enabled: false } })),
  ]);

  return (
    <div className="theme-public flex min-h-screen flex-col bg-bg text-fg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <AnnouncementBar announcement={chrome.announcement} />
      <SiteHeader
        viewer={
          viewer
            ? { name: viewer.fullName || viewer.email || "Account", avatarUrl: viewer.avatarUrl, role: viewer.role }
            : null
        }
      />
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
