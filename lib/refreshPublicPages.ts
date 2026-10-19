// After an admin or organizer change that visitors can see (event details,
// publishing, cancelling, categories, homepage content), refresh the cached
// public pages now instead of waiting up to a minute. Never fails the change
// itself: if this call fails, the pages still refresh on their own.
export function refreshPublicPages(): void {
  void fetch("/api/revalidate", { method: "POST" }).catch(() => undefined);
}
