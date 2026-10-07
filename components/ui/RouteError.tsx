"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/Button";

type RouteErrorProps = {
  error: Error & { digest?: string };
  retry: () => void;
  title?: string;
  homeHref?: string;
  homeLabel?: string;
};

// Shared body for error.tsx boundaries. In production, server errors arrive
// with a generic message, so we never show error.message to visitors; the
// digest lets you find the full error in the server logs.
export function RouteError({
  error,
  retry,
  title = "Something went wrong",
  homeHref = "/",
  homeLabel = "Go to homepage",
}: RouteErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto grid max-w-lg justify-items-center gap-4 px-4 py-20 text-center">
      <p aria-hidden className="text-4xl">
        ⚠️
      </p>
      <h1 className="text-2xl font-extrabold">{title}</h1>
      <p className="text-muted">
        This is usually temporary. Check your connection and try again.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={retry}>Try again</Button>
        <Link href={homeHref} className={buttonClasses("secondary")}>
          {homeLabel}
        </Link>
      </div>
      {error.digest ? <p className="text-xs text-muted">Error reference: {error.digest}</p> : null}
    </div>
  );
}
