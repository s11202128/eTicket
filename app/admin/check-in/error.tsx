"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="Check-in failed to load" homeHref="/admin/check-in" homeLabel="Reload check-in" />;
}
