import { Skeleton } from "@/components/ui/skeleton";

export function AccountsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="glass rounded-2xl p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="flex gap-2 pt-4">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}
