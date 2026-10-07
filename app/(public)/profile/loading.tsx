import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div role="status" aria-label="Loading profile" className="mx-auto grid max-w-2xl gap-6 px-4 py-10 sm:px-6">
      <Skeleton className="h-10 w-40" />
      <Skeleton className="h-80 rounded-xl" />
    </div>
  );
}
