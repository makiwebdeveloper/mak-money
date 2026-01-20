import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-40" />
            </div>
            <Skeleton className="h-5 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}
