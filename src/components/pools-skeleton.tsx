import { Skeleton } from "@/components/ui/skeleton";

export function PoolsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
          </div>
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-9 flex-1" />
            <Skeleton className="h-9 flex-1" />
          </div>
        </div>
      ))}
    </div>
  );
}
