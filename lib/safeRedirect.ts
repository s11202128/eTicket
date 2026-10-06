// Only allow same-site paths as post-login destinations, so ?next= can't be
// used to send people to another website (open redirect).
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
