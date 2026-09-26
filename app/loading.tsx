import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="pb-16 pt-12" aria-label="Loading">
      <div className="flex items-start gap-6">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="flex-1 space-y-3 pt-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40" />
        ))}
      </div>
      <Skeleton className="mt-12 h-64" />
      <div className="mt-12 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
