"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES } from "@/lib/constants/currencies";
import AllocationManager from "@/components/allocation-manager";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";
import {
  usePools,
  useCreatePool,
  usePermanentDeletePool,
} from "@/lib/hooks/usePools";

type Pool = Database["public"]["Tables"]["money_pools"]["Row"] & {
  balance?: number;
  currency?: string;
};

interface PoolBalance {
  pool_id: string;
  total_amount: number;
}

interface PoolsClientProps {
  pools: Pool[];
  poolBalances: PoolBalance[];
  currency: string;
  userId: string;
}

export default function PoolsClient({
  pools: initialPools,
  poolBalances: initialPoolBalances,
  currency,
}: PoolsClientProps) {
  // Use react-query hooks
  const { data: poolsData = initialPools } = usePools();
  const pools: Pool[] = poolsData as Pool[];
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

  const currencySymbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  // Only show active pools
  const displayedPools = pools.filter((pool) => pool.is_active);

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

  // Get balance from pool data
  const getPoolBalance = (poolId: string) => {
    const pool = pools.find((p) => p.id === poolId);
    return pool?.balance || 0;
  };

  // Get free funds balance
  const freePool = pools.find((p) => p.type === "free");
  const freeBalance = freePool ? getPoolBalance(freePool.id) : 0;

  // Total in Pools = sum of all active pools EXCEPT Free pool (only allocated money)
  const totalBalance = pools
    .filter((p) => p.is_active && p.type !== "free")
    .reduce((sum, pool) => sum + getPoolBalance(pool.id), 0);

  const isLoading = createPool.isPending || deletePool.isPending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent mb-1 sm:mb-2">
            Money Pools
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Manage and allocate your funds
          </p>
        </div>

        {/* Total and Free Balance */}
        <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="card-glass p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Total in Pools
            </p>
            <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-accent">
              {currencySymbol}
              {totalBalance.toFixed(2)}
            </p>
          </div>
          <div className="card-glass p-4 sm:p-5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition rounded-2xl"></div>
            <p className="relative text-xs sm:text-sm font-semibold text-muted-foreground">
              Free Funds
            </p>
            <p className="relative mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {currencySymbol}
              {freeBalance.toFixed(2)}
            </p>
            <p className="relative mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              Available for allocation
            </p>
          </div>
        </div>

        {/* Pools List */}
        {isLoading && displayedPools.length === 0 ? (
          <PoolsSkeleton />
        ) : (
          <div className="space-y-3">
            {displayedPools.length === 0 ? (
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
                          {getPoolBalance(pool.id).toFixed(2)}
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
                                name: pool.name,
                                amount: getPoolBalance(pool.id),
                              })
                            }
                            disabled={isLoading}
                            className="smooth-transition rounded-xl px-3 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm bg-gradient-to-r from-accent to-accent/80 text-white hover:shadow-lg active:scale-95 touch-target"
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
                                name: pool.name,
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
