"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES } from "@/lib/constants/currencies";
import { formatNumber } from "@/lib/utils";
import AllocationManager from "@/components/allocation-manager";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";
import {
  usePools,
  useCreatePool,
  usePermanentDeletePool,
  useFreeBalance,
  useExcludedAccountsBalance,
} from "@/lib/hooks/usePools";
import { useAllocations } from "@/lib/hooks/useAllocations";

type Pool = Database["public"]["Tables"]["money_pools"]["Row"] & {
  balance?: number;
  currency?: string;
};

interface PoolBalance {
  pool_id: string;
  total_amount: number;
}

interface PoolsClientProps {
  currency: string;
  userId: string;
}

export default function PoolsClient({ currency }: PoolsClientProps) {
  // Use react-query hooks - fetch and decrypt on client only
  const { data: poolsData, isLoading: poolsLoading } = usePools();
  const { data: allocations = [], isLoading: allocationsLoading } =
    useAllocations();
  const pools: Pool[] = (poolsData as Pool[]) || [];
  const { data: freeBalance = 0 } = useFreeBalance();
  const { data: excludedBalance = 0, hasExcludedAccounts = false } =
    useExcludedAccountsBalance();

  console.log("All allocations:", allocations);
  console.log("All pools:", pools);
  const createPool = useCreatePool();
  const deletePool = usePermanentDeletePool();

  const [isCreating, setIsCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingPool, setEditingPool] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  // Show loading state while fetching and decrypting data
  if (poolsLoading || allocationsLoading) {
    return <PoolsSkeleton />;
  }

  const currencySymbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  // Only show active pools (excluding Free pool since it's shown separately above)
  const displayedPools = pools.filter(
    (pool) => pool.is_active && pool.type !== "free",
  );

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim() || createPool.isPending) return;

    try {
      await createPool.mutateAsync({
        name: newPoolName,
        type: "custom",
      });
      setNewPoolName("");
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating pool:", error);
      alert("Failed to create pool");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deletePool.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting pool:", error);
      alert("Failed to delete pool");
    }
  };

  // Calculate pool balance from allocations
  const getPoolBalance = (poolId: string) => {
    const poolAllocations = allocations.filter(
      (allocation) => allocation.pool_id === poolId,
    );
    console.log("Pool allocations for", poolId, ":", poolAllocations);
    const balance = poolAllocations.reduce((sum, allocation) => {
      console.log("Adding allocation amount:", allocation.amount);
      return sum + (allocation.amount || 0);
    }, 0);
    console.log("Total pool balance:", balance);
    return balance;
  };

  // Total in Pools = sum of all active pools EXCEPT Free pool (only allocated money)
  const totalBalance = pools
    .filter((p) => p.is_active && p.type !== "free")
    .reduce((sum, pool) => sum + getPoolBalance(pool.id), 0);

  const isLoading = Boolean(createPool.isPending || deletePool.isPending);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-12 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header */}
        {/* <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Money Pools
          </h1>
        </div> */}

        {/* Total and Free Balance */}
        <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="card-glass p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Total in Pools
            </p>
            <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-accent">
              {currencySymbol}
              {formatNumber(totalBalance)}
            </p>
          </div>
          <div className="card-glass p-4 sm:p-5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition rounded-2xl"></div>
            <p className="relative text-xs sm:text-sm font-semibold text-muted-foreground">
              Free Funds
            </p>
            <p className="relative mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {currencySymbol}
              {formatNumber(freeBalance)}
            </p>
            <p className="relative mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              Available for allocation
            </p>
          </div>
        </div>

        {/* Pools List */}
        {isLoading && displayedPools.length === 0 && !hasExcludedAccounts ? (
          <PoolsSkeleton />
        ) : (
          <div className="space-y-3">
            {/* Virtual Excluded Accounts Pool */}
            {hasExcludedAccounts && (
              <div className="card-glass p-4 sm:p-5 border-2 border-orange-200 dark:border-orange-800/50">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-12 sm:h-14 w-12 sm:w-14 rounded-full shadow-lg flex-shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#fb923c" }}
                    >
                      <svg
                        className="h-6 sm:h-7 w-6 sm:w-7 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                        Reserved Accounts
                      </h3>
                      <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground">
                        Excluded from free funds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-start gap-2 flex-shrink-0">
                    <div className="text-right sm:text-left">
                      <p className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {currencySymbol}
                        {formatNumber(excludedBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {displayedPools.length === 0 && !hasExcludedAccounts ? (
              <div className="card-glass text-center py-12 sm:py-16">
                <p className="text-sm sm:text-base text-muted-foreground">
                  No pools. Create your first pool.
                </p>
              </div>
            ) : (
              displayedPools.map((pool) => (
                <div key={pool.id} className="card-glass p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="h-12 sm:h-14 w-12 sm:w-14 rounded-full shadow-lg flex-shrink-0"
                        style={{ backgroundColor: pool.color }}
                      />
                      <div className="min-w-0">
                        <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                          {pool.name}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm capitalize text-muted-foreground">
                          {pool.type === "free"
                            ? "Free"
                            : pool.type === "custom"
                              ? "Custom"
                              : pool.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-start gap-2 flex-shrink-0">
                      <div className="text-right sm:text-left">
                        <p className="text-lg sm:text-2xl font-bold text-accent">
                          {currencySymbol}
                          {formatNumber(getPoolBalance(pool.id))}
                        </p>
                      </div>

                      {/* Pool actions */}
                      <div className="flex gap-2 sm:gap-3">
                        {/* Allocation management button - only for non-free pools */}
                        {pool.type !== "free" && (
                          <button
                            onClick={() =>
                              setEditingPool({
                                id: pool.id,
                                name: pool.name || "Unnamed Pool",
                                amount: getPoolBalance(pool.id),
                              })
                            }
                            disabled={isLoading || pool.id.startsWith("temp-")}
                            className="smooth-transition rounded-xl px-3 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm bg-gradient-to-r from-accent to-accent/80 text-white hover:shadow-lg active:scale-95 touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              pool.id.startsWith("temp-")
                                ? "Pool is being created..."
                                : "Allocate funds"
                            }
                          >
                            Allocate
                          </button>
                        )}
                        {/* Delete button - only for non-free pools */}
                        {pool.type !== "free" && (
                          <button
                            onClick={() =>
                              setDeleteConfirm({
                                id: pool.id,
                                name: pool.name || "Unnamed Pool",
                              })
                            }
                            disabled={isLoading}
                            className="smooth-transition rounded-lg p-2 glass hover:shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 active:scale-95 touch-target disabled:opacity-50"
                            title="Delete pool"
                          >
                            <svg
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create New Pool */}
        <div className="mt-8">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="glass-sm w-full smooth-transition rounded-2xl border-2 border-dashed border-accent/30 p-6 sm:p-8 text-center font-semibold text-xs sm:text-sm text-muted-foreground hover:border-accent hover:shadow-md touch-target"
            >
              Create New Pool
            </button>
          ) : (
            <form onSubmit={handleCreatePool} className="card-glass">
              <h3 className="mb-5 sm:mb-6 text-xl sm:text-2xl font-bold text-foreground">
                New Money Pool
              </h3>
              <input
                type="text"
                value={newPoolName}
                onChange={(e) => setNewPoolName(e.target.value)}
                placeholder="e.g., Rent, Savings"
                className="glass-sm mobile-input mb-5 sm:mb-6 w-full rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                autoFocus
                disabled={isLoading}
              />
              <div className="flex gap-2 sm:gap-3">
                <button
                  type="submit"
                  disabled={isLoading || !newPoolName.trim()}
                  className="flex-1 smooth-transition rounded-xl bg-gradient-to-r from-accent to-accent/80 px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base text-white hover:shadow-lg active:scale-95 disabled:opacity-50 touch-target"
                >
                  {isLoading ? "Creating..." : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCreating(false);
                    setNewPoolName("");
                  }}
                  disabled={isLoading}
                  className="flex-1 smooth-transition rounded-xl glass hover:shadow-md text-foreground font-semibold text-sm sm:text-base touch-target"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Confirm Delete Modal */}
        {deleteConfirm && (
          <ConfirmDeleteModal
            isOpen={!!deleteConfirm}
            title="Delete Pool"
            message={`Are you sure you want to delete "${deleteConfirm.name}"? This action cannot be undone and will remove all associated data.`}
            onConfirm={handleDelete}
            onCancel={() => setDeleteConfirm(null)}
            isDeleting={deletePool.isPending}
          />
        )}

        {/* Allocation Manager Modal */}
        {editingPool && (
          <AllocationManager
            poolId={editingPool.id}
            poolName={editingPool.name}
            currentAmount={editingPool.amount}
            freeBalance={freeBalance}
            onClose={() => setEditingPool(null)}
            onSuccess={() => {
              // React Query will automatically refetch pools and accounts
              setEditingPool(null);
            }}
          />
        )}
      </div>
    </div>
  );
}
