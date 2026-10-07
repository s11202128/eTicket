"use client";

import { RouteError } from "@/components/ui/RouteError";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <RouteError error={error} retry={retry} title="This page failed to load" homeHref="/manager" homeLabel="Event Manager overview" />;
}
