"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="We couldn't load events" homeHref="/" homeLabel="Go to homepage" />;
}
