import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-28 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-12">
          <Skeleton className="h-7 sm:h-10 lg:h-12 w-48 sm:w-64 mb-1 sm:mb-2" />
          <Skeleton className="h-3 sm:h-5 w-32 sm:w-40" />
        </div>

        {/* Balances cards skeleton */}
        <div className="mb-5 sm:mb-8 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Balance Card */}
          <div className="card-glass p-3 sm:p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 sm:h-9 lg:h-10 w-32 sm:w-40" />
            <Skeleton className="h-3 w-20 mt-2 sm:mt-4" />
          </div>

          {/* Free Balance Card */}
          <div className="card-glass p-3 sm:p-4">
            <Skeleton className="h-3 w-24 mb-2" />
            <Skeleton className="h-7 sm:h-9 lg:h-10 w-32 sm:w-40" />
            <Skeleton className="h-3 sm:h-3.5 w-32 sm:w-36 mt-3 sm:mt-4" />
          </div>

          {/* Allocated Card */}
          <div className="card-glass p-3 sm:p-4 sm:col-span-2 lg:col-span-1">
            <Skeleton className="h-3 sm:h-3.5 w-32 sm:w-36 mb-2 sm:mb-3" />
            <Skeleton className="h-8 sm:h-9 lg:h-10 w-32 sm:w-40" />
            <Skeleton className="h-3 sm:h-3.5 w-20 mt-3 sm:mt-4" />
          </div>
        </div>

        {/* Recent Transactions skeleton */}
        <div className="card-glass mb-6 sm:mb-8">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <Skeleton className="h-6 sm:h-7 w-44 sm:w-52" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="space-y-3 sm:space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="glass-sm flex items-center justify-between rounded-xl p-3 sm:p-4"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                  <Skeleton className="h-10 sm:h-11 w-10 sm:w-11 rounded-full flex-shrink-0" />
                  <div className="min-w-0">
                    <Skeleton className="h-4 w-24 sm:w-32 mb-1" />
                    <Skeleton className="h-3 w-32 sm:w-40" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 sm:w-20 flex-shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
