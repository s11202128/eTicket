import { Skeleton, SkeletonRows } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="grid gap-6">
      <Skeleton className="h-9 w-56" />
      <SkeletonRows rows={8} label="Loading admin page" />
    </div>
  );
}
