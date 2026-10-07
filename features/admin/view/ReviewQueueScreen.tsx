"use client";

import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { LocalDateTime } from "@/components/ui/LocalDateTime";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { useAsyncData } from "@/lib/useAsyncData";
import { ErrorState, PageHeader } from "@/features/admin/view/AdminUi";
import { listReviewQueue } from "@/features/admin/model/reviews.repository";

export default function ReviewQueueScreen() {
  const { data, error, isLoading, reload } = useAsyncData(listReviewQueue, "review-queue");

  return (
    <>
      <PageHeader title="Event reviews" description="Events submitted by organizers, oldest first. Nothing goes live until it's approved." />
      {error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : isLoading || !data ? (
        <SkeletonRows rows={5} label="Loading review queue" />
      ) : data.length === 0 ? (
        <EmptyState icon="✅" title="All caught up" description="New submissions and live events with major changes appear here." />
      ) : (
        <ul className="grid gap-3">
          {data.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/reviews/${event.id}`}
                className="grid gap-4 rounded-lg border border-border bg-surface p-3 hover:border-fg/30 sm:grid-cols-[160px_1fr_auto] sm:items-center"
              >
                <div className="relative aspect-video overflow-hidden rounded-md">
                  <Image src={event.imageSrc} alt="" fill sizes="160px" className="object-cover" />
                </div>
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{event.title}</p>
                    {event.wasLive ? <Badge tone="warning">Live event changed</Badge> : <Badge tone="neutral">New</Badge>}
                  </div>
                  <p className="text-sm text-muted">
                    {event.organizationName ?? "Platform event"} · <LocalDateTime iso={event.startsAt} /> · {event.location}
                  </p>
                </div>
                <p className="text-xs text-muted sm:text-right">
                  {event.submittedAt ? (
                    <>
                      Submitted
                      <br />
                      <LocalDateTime iso={event.submittedAt} />
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
