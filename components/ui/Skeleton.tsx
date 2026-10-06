import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-pulse rounded-md bg-surface-2", className)} />;
}

// Screen-reader friendly loading block of skeleton rows.
export function SkeletonRows({ rows = 5, label = "Loading" }: { rows?: number; label?: string }) {
  return (
    <div role="status" aria-label={label} className="grid gap-2">
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full" />
      ))}
    </div>
  );
}
