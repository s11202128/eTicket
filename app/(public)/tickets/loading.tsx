import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading tickets" className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}
