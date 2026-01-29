import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Database, DecryptedPool } from "@/lib/types/database";
import { useAccounts } from "./useAccounts";
import { useAllocations } from "./useAllocations";
import { usePoolEncryption, useAllocationEncryption } from "./useEncryption";
import { useUserCurrency } from "./useUser";
import { convertCurrency } from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";
import { useState, useEffect } from "react";

// Query keys
export const poolKeys = {
  all: ["pools"] as const,
  lists: () => [...poolKeys.all, "list"] as const,
  list: (filters?: any) => [...poolKeys.lists(), filters] as const,
};

// Fetch and decrypt pools
export function usePools() {
  const { decryptPoolRow } = usePoolEncryption();

  return useQuery({
    queryKey: poolKeys.list(),
    queryFn: async (): Promise<DecryptedPool[]> => {
      const response = await fetch("/api/pools");
      if (!response.ok) {
        throw new Error("Failed to fetch pools");
      }
      const data = await response.json();

      // Decrypt all pools on client side
      const decrypted = await Promise.all(
        (data.pools || []).map(async (pool: any) => {
          try {
            // For system pools (like Free) with empty encrypted_data, use defaults
            if (
              !pool.encrypted_data ||
              Object.keys(pool.encrypted_data).length === 0
            ) {
              return {
                ...pool,
                name: pool.type === "free" ? "Free" : "Unknown Pool",
              } as DecryptedPool;
            }
            return await decryptPoolRow(pool);
          } catch (error) {
            console.error("Failed to decrypt pool:", pool.id, error);
            return {
              ...pool,
              name: "Encrypted Pool",
            } as DecryptedPool;
          }
        }),
      );

      return decrypted.filter((pool): pool is DecryptedPool => pool !== null);
    },
  });
}

// Calculate free balance from decrypted accounts (client-side only)
// Free balance = Total balance of non-excluded accounts - Sum of all allocations (excluding free pool)
export function useFreeBalance() {
  const { data: accounts, isLoading: accountsLoading } = useAccounts();
  const { data: allocations, isLoading: allocationsLoading } = useAllocations();
  const { data: pools, isLoading: poolsLoading } = usePools();
  const { data: defaultCurrency, isLoading: currencyLoading } =
    useUserCurrency();

  const [freeBalance, setFreeBalance] = useState(0);
  const [isConverting, setIsConverting] = useState(false);

  useEffect(() => {
    const calculateFreeBalance = async () => {
      if (!accounts || !allocations || !pools || !defaultCurrency) return;

      setIsConverting(true);
      try {
        // Find the free pool ID
        const freePoolId = pools.find((p) => p.type === "free")?.id;

        // Calculate total balance from active accounts (excluding those marked as exclude_from_free)
        let totalAccountBalance = 0;
        for (const account of accounts) {
          if (
            account.is_active &&
            !account.exclude_from_free &&
            account.balance
          ) {
            const converted = await convertCurrency(
              account.balance,
              account.currency as CurrencyCode,
              defaultCurrency,
            );
            totalAccountBalance += converted;
          }
        }

        // Calculate total allocated (excluding allocations to free pool)
        let totalAllocated = 0;
        for (const allocation of allocations) {
          if (allocation.pool_id !== freePoolId && allocation.amount) {
            // Find the account to get its currency
            const account = accounts.find(
              (acc) => acc.id === allocation.account_id,
            );
            const accountCurrency = account?.currency || defaultCurrency;

            const converted = await convertCurrency(
              allocation.amount,
              accountCurrency as CurrencyCode,
              defaultCurrency,
            );
            totalAllocated += converted;
          }
        }

        // Free balance = Total balance - Total allocated
        const balance = Number(
          (totalAccountBalance - totalAllocated).toFixed(2),
        );
        setFreeBalance(balance);
      } catch (error) {
        console.error("Failed to calculate free balance:", error);
        setFreeBalance(0);
      } finally {
        setIsConverting(false);
      }
    };

    calculateFreeBalance();
  }, [accounts, allocations, pools, defaultCurrency]);

  return {
    data: freeBalance,
    isLoading:
      accountsLoading ||
      allocationsLoading ||
      poolsLoading ||
      currencyLoading ||
      isConverting,
  };
}

// Create pool
export function useCreatePool() {
  const queryClient = useQueryClient();
  const { encryptPool } = usePoolEncryption();

  return useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      // Encrypt the pool name
      const encrypted_data = await encryptPool(data.name);

      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: data.type,
          encrypted_data,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create pool");
      }

      return response.json();
    },
    onMutate: async (newPool) => {
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      const previousPools = queryClient.getQueryData<DecryptedPool[]>(
        poolKeys.list(),
      );

      queryClient.setQueryData<DecryptedPool[]>(poolKeys.list(), (old) => {
        if (!old) return old;
        const optimisticPool: DecryptedPool = {
          id: `temp-${Date.now()}`,
          user_id: "",
          name: newPool.name,
          type: newPool.type as any,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
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
  const { encryptPool } = usePoolEncryption();

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // Encrypt the pool name
      const encrypted_data = await encryptPool(name);

      const response = await fetch(`/api/pools/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ encrypted_data }),
      });

      if (!response.ok) {
        throw new Error("Failed to update pool");
      }

      return response.json();
    },
    onMutate: async ({ id, name }) => {
      await queryClient.cancelQueries({ queryKey: poolKeys.list() });

      const previousPools = queryClient.getQueryData<DecryptedPool[]>(
        poolKeys.list(),
      );

      queryClient.setQueryData<DecryptedPool[]>(poolKeys.list(), (old) => {
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

      const previousPools = queryClient.getQueryData<DecryptedPool[]>(
        poolKeys.list(),
      );

      queryClient.setQueryData<DecryptedPool[]>(poolKeys.list(), (old) => {
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
    },
  });
}

// Transfer allocation
export function useTransferAllocation() {
  const queryClient = useQueryClient();
  const { encryptAllocation } = useAllocationEncryption();

  return useMutation({
    mutationFn: async (data: {
      account_id: string;
      pool_id: string;
      new_amount: number;
    }) => {
      // Encrypt the allocation amount
      const encrypted_data = await encryptAllocation(data.new_amount);

      const response = await fetch("/api/allocations/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: data.account_id,
          pool_id: data.pool_id,
          encrypted_data,
        }),
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
      const previousPools = queryClient.getQueryData<DecryptedPool[]>(
        poolKeys.list(),
      );

      // Optimistically update (pools don't have balance property anymore - remove this)
      // Balance calculation is now done client-side in useFreeBalance

      return { previousPools };
    },
    onError: (err, data, context) => {
      // Rollback on error
      if (context?.previousPools) {
        queryClient.setQueryData(poolKeys.list(), context.previousPools);
      }
    },
    onSuccess: () => {
      // Invalidate to get fresh encrypted data
      queryClient.invalidateQueries({ queryKey: poolKeys.list() });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["allocations"] });
    },
  });
}
