import { Skeleton } from "@/components/ui/skeleton";

export function TransactionsSkeleton() {
  return (
    <div className="card-glass overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-white/20">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                Category
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                Description
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="hover:bg-white/5 smooth-transition">
                <td className="whitespace-nowrap px-6 py-4">
                  <Skeleton className="h-4 w-24" />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Skeleton className="h-4 w-20" />
                </td>
                <td className="whitespace-nowrap px-6 py-4">
                  <Skeleton className="h-4 w-16" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-32" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
