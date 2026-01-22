import { Skeleton } from "@/components/ui/skeleton";

export function PoolsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="card-glass p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            {/* Left side: Color icon + Name */}
            <div className="flex items-center gap-2 min-w-0">
              <Skeleton className="h-12 sm:h-14 w-12 sm:w-14 rounded-full flex-shrink-0" />
              <div className="min-w-0">
                <Skeleton className="h-4 sm:h-5 w-24 sm:w-32 mb-1" />
                <Skeleton className="h-3 sm:h-3.5 w-16 sm:w-20 mt-0.5 sm:mt-1" />
              </div>
            </div>

            {/* Right side: Balance + Buttons */}
            <div className="flex items-center justify-between sm:justify-start gap-2 flex-shrink-0">
              <div className="text-right sm:text-left">
                <Skeleton className="h-5 sm:h-6 w-20 sm:w-24" />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 sm:gap-3">
                <Skeleton className="h-10 sm:h-11 w-18 sm:w-24 rounded-xl" />
                <Skeleton className="h-9 w-9 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
