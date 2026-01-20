import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-5xl">
        {/* Welcome section skeleton */}
        <div className="mb-8 sm:mb-12">
          <Skeleton className="h-10 sm:h-14 w-56 mb-3" />
          <Skeleton className="h-4 w-96" />
        </div>

        {/* Cards grid skeleton */}
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3 mb-8 sm:mb-12">
          {/* Total Balance Card */}
          <div className="card-glass p-5 sm:p-6">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>

          {/* Free Balance Card */}
          <div className="card-glass p-5 sm:p-6">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-40 mb-2" />
            <Skeleton className="h-3 w-28" />
          </div>

          {/* Accounts Count Card */}
          <div className="card-glass p-5 sm:p-6">
            <Skeleton className="h-4 w-32 mb-3" />
            <Skeleton className="h-8 w-16 mb-2" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>

        {/* Quick Actions skeleton */}
        <div className="mb-8 sm:mb-12">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        </div>

        {/* Recent Transactions skeleton */}
        <div>
          <Skeleton className="h-6 w-48 mb-4" />
          <div className="space-y-2 sm:space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="glass rounded-xl p-3 sm:p-4 flex items-center gap-3"
              >
                <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-40" />
                </div>
                <Skeleton className="h-5 w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
