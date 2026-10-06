"use client";

import { useSearchParams } from "next/navigation";

const NOTICES: Record<string, string> = {
  "not-authorized": "You don't have access to that page.",
  "link-expired": "That link is invalid or has expired. Please try again.",
  "signed-out": "You've been signed out.",
};

// Shows a one-line message passed as ?notice=<code> by redirects.
export function NoticeBanner() {
  const params = useSearchParams();
  const code = params.get("notice");
  const message = code ? NOTICES[code] : undefined;
  if (!message) return null;

  return (
    <div role="status" className="border-b border-border bg-surface-2">
      <p className="mx-auto max-w-6xl px-4 py-2.5 text-sm font-medium sm:px-6">{message}</p>
    </div>
  );
}
