import { Skeleton } from "@/components/ui/skeleton";

export function AccountsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="card-glass p-3 sm:p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-1" />
              <Skeleton className="h-3 w-20 sm:w-24 mt-0.5 sm:mt-1" />
              <div className="mt-1.5 sm:mt-2">
                <Skeleton className="h-5 sm:h-6 w-24 sm:w-32" />
                <Skeleton className="h-3 sm:h-3.5 w-28 sm:w-40 mt-1" />
              </div>
            </div>
            {/* Delete button skeleton */}
            <Skeleton className="h-9 w-9 rounded-lg flex-shrink-0" />
          </div>
        </div>
      ))}
    </div>
  );
}
