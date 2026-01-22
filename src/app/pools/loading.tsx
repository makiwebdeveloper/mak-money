import { PoolsSkeleton } from "@/components/pools-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-8 sm:mb-10">
          <Skeleton className="h-7 sm:h-10 lg:h-12 w-44 mb-1 sm:mb-2" />
          <Skeleton className="h-3.5 sm:h-4 w-52" />
        </div>

        {/* Balance cards skeleton */}
        <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="card-glass p-4 sm:p-5">
            <Skeleton className="h-3 sm:h-4 w-24 mb-1.5 sm:mb-2" />
            <Skeleton className="h-8 sm:h-9 w-28" />
          </div>
          <div className="card-glass p-4 sm:p-5">
            <Skeleton className="h-3 sm:h-4 w-24 mb-1.5 sm:mb-2" />
            <Skeleton className="h-8 sm:h-9 w-28" />
            <Skeleton className="h-3 sm:h-4 w-40 mt-1 sm:mt-2" />
          </div>
        </div>

        {/* Pools skeleton */}
        <PoolsSkeleton />
      </div>
    </div>
  );
}
