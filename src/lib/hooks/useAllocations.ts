import { useQuery } from "@tanstack/react-query";
import { DecryptedAllocation } from "@/lib/types/database";
import { useAllocationEncryption } from "./useEncryption";

// Query keys
export const allocationKeys = {
  all: ["allocations"] as const,
  lists: () => [...allocationKeys.all, "list"] as const,
  list: (filters?: any) => [...allocationKeys.lists(), filters] as const,
};

// Fetch and decrypt allocations
export function useAllocations() {
  const { decryptAllocationRow } = useAllocationEncryption();

  return useQuery({
    queryKey: allocationKeys.list(),
    queryFn: async (): Promise<DecryptedAllocation[]> => {
      // Fetch encrypted data from server
      const response = await fetch("/api/allocations");
      if (!response.ok) {
        throw new Error("Failed to fetch allocations");
      }
      const { allocations } = await response.json();

      // Decrypt all allocations on client side
      const decrypted = await Promise.all(
        (allocations || []).map(async (allocation: any) => {
          try {
            return await decryptAllocationRow(allocation);
          } catch (error) {
            console.error("Failed to decrypt allocation:", allocation.id, error);
            return null;
          }
        })
      );

      // Filter out failed decryptions
      return decrypted.filter((alloc): alloc is DecryptedAllocation => alloc !== null);
    },
  });
}
