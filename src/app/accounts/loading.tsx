import { AccountsSkeleton } from "@/components/accounts-skeleton";
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header skeleton */}
        <div className="mb-6 sm:mb-8">
          <Skeleton className="h-10 sm:h-14 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>

        {/* Toggle buttons skeleton */}
        <div className="mb-4 sm:mb-6 flex gap-2">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 flex-1" />
        </div>

        {/* Accounts skeleton */}
        <AccountsSkeleton />
      </div>
    </div>
  );
}
