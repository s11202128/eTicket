import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading ticket" className="mx-auto grid max-w-4xl gap-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-72 rounded-xl" />
      <Skeleton className="h-10 w-full max-w-lg" />
    </div>
  );
}
