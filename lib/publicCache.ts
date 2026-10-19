// Shared settings for the cached public pages (see app/(public)/layout.tsx).

// Every cached public read carries this tag; app/api/revalidate refreshes them
// all after an admin or organizer change.
export const PUBLIC_CACHE_TAG = "public";

// Pages also refresh by themselves at least this often (seconds). Route files
// repeat the number as a literal: `export const revalidate` must be static.
export const PUBLIC_REVALIDATE_SECONDS = 60;
