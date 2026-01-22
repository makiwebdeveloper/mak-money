import { TransactionsSkeleton } from "@/components/transactions-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <Skeleton className="h-7 sm:h-10 lg:h-12 w-48 mb-1 sm:mb-2" />
            <Skeleton className="h-3.5 sm:h-4 w-36" />
          </div>
          <Skeleton className="h-8 sm:h-9 w-32 sm:w-36 rounded-lg sm:rounded-xl" />
        </div>

        {/* Transactions list skeleton */}
        <TransactionsSkeleton />
      </div>
    </div>
  );
}
