import { TransactionsSkeleton } from "@/components/transactions-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8">
          <Skeleton className="h-10 sm:h-14 w-56 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Create transaction form skeleton */}
        <div className="card-glass p-4 sm:p-6 mb-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>

        {/* Transactions list skeleton */}
        <TransactionsSkeleton />
      </div>
    </div>
  );
}
