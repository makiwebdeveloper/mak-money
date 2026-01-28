import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database } from "@/lib/types/database";

type Pool = Database["public"]["Tables"]["money_pools"]["Row"] & {
  balance?: number;
  currency?: string;
};

interface PoolBalance {
  pool_id: string;
  total_amount: number;
}

// Query keys
export const poolKeys = {
  all: ["pools"] as const,
  lists: () => [...poolKeys.all, "list"] as const,
  list: (filters?: any) => [...poolKeys.lists(), filters] as const,
  balances: () => [...poolKeys.all, "balances"] as const,
  freeBalance: () => [...poolKeys.all, "freeBalance"] as const,
};

// Fetch pools
export function usePools() {
  return useQuery({
    queryKey: poolKeys.list(),
    queryFn: async (): Promise<Pool[]> => {
      const response = await fetch("/api/pools");
      if (!response.ok) {
        throw new Error("Failed to fetch pools");
      }
      const data = await response.json();
      return data.pools || [];
    },
  });
}

// Fetch pool balances
export function usePoolBalances() {
  return useQuery({
    queryKey: poolKeys.balances(),
    queryFn: async (): Promise<PoolBalance[]> => {
      const response = await fetch("/api/pools/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch pool balances");
      }
      const data = await response.json();
      return data.poolBalances || [];
    },
  });
}

// Fetch free balance
export function useFreeBalance() {
  return useQuery({
    queryKey: poolKeys.freeBalance(),
    queryFn: async (): Promise<number> => {
      const response = await fetch("/api/pools/balance");
      if (!response.ok) {
        throw new Error("Failed to fetch free balance");
      }
      const data = await response.json();
      return data.freeBalance || 0;
    },
  });
}

// Create pool
export function useCreatePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Failed to create pool");
      }

      return response.json();
    },
    onMutate: async (newPool) => {
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      const previousPools = queryClient.getQueryData<Pool[]>(poolKeys.list());

      queryClient.setQueryData<Pool[]>(poolKeys.list(), (old) => {
        if (!old) return old;
        const optimisticPool: Pool = {
          id: `temp-${Date.now()}`,
          user_id: "",
          name: newPool.name,
          type: newPool.type as any,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          encrypted_data: null,
          // Make random color and icon for optimistic update
          color: "#d4d4d4",
          icon: "piggy-bank",
        };
        return [...old, optimisticPool];
      });

      return { previousPools };
    },
    onError: (err, newPool, context) => {
      if (context?.previousPools) {
        queryClient.setQueryData(poolKeys.list(), context.previousPools);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
    },
  });
}

// Update pool
export function useUpdatePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const response = await fetch(`/api/pools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (!response.ok) {
        throw new Error("Failed to update pool");
      }

      return response.json();
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      const previousPools = queryClient.getQueryData<Pool[]>(poolKeys.list());

      queryClient.setQueryData<Pool[]>(poolKeys.list(), (old) => {
        if (!old) return old;
        return old.map((pool) => (pool.id === id ? { ...pool, name } : pool));
      });

      return { previousPools };
    },
    onError: (err, variables, context) => {
      if (context?.previousPools) {
        queryClient.setQueryData(poolKeys.list(), context.previousPools);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
    },
  });
}

// Permanently delete pool
export function usePermanentDeletePool() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (poolId: string) => {
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to permanently delete pool");
      }

      return response.json();
    },
    onMutate: async (poolId) => {
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      const previousPools = queryClient.getQueryData<Pool[]>(poolKeys.list());

      queryClient.setQueryData<Pool[]>(poolKeys.list(), (old) => {
        if (!old) return old;
        return old.filter((pool) => pool.id !== poolId);
      });

      return { previousPools };
    },
    onError: (err, poolId, context) => {
      if (context?.previousPools) {
        queryClient.setQueryData(poolKeys.list(), context.previousPools);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
      queryClient.invalidateQueries({ queryKey: poolKeys.freeBalance() });
      queryClient.invalidateQueries({ queryKey: poolKeys.balances() });
    },
  });
}

// Transfer allocation
export function useTransferAllocation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      account_id: string;
      pool_id: string;
      new_amount: number;
    }) => {
      const response = await fetch("/api/allocations/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to transfer allocation");
      }

      return response.json();
    },
    onMutate: async (data) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      // Snapshot previous state
      const previousPools = queryClient.getQueryData<Pool[]>(poolKeys.list());

      // Optimistically update pool balance
      queryClient.setQueryData<Pool[]>(poolKeys.list(), (old) => {
        if (!old) return old;
        return old.map((pool) => {
          if (pool.id === data.pool_id && pool.balance !== undefined) {
            return {
              ...pool,
              balance: data.new_amount,
            };
          }
          return pool;
        });
      });

      return { previousPools };
    },
    onError: (err, data, context) => {
      // Rollback on error
      if (context?.previousPools) {
        queryClient.setQueryData(poolKeys.list(), context.previousPools);
      }
    },
    onSuccess: () => {
      // Invalidate pools (which now include balances) and accounts
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
      queryClient.invalidateQueries({ queryKey: poolKeys.freeBalance() });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
