import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <div className="pb-16" aria-label="Loading">
      <div className="pt-12">
        <Skeleton className="h-16 w-96" />
        <Skeleton className="mt-3 h-5 w-[32rem]" />
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-surface-card p-6">
            <Skeleton className="h-7 w-2/3" />
            <Skeleton className="mt-3 h-4 w-full" />
            <Skeleton className="mt-2 h-4 w-5/6" />
            <Skeleton className="mt-4 h-2 w-full rounded-full" />
            <Skeleton className="mt-4 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}
