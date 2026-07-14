"use client";

import { DragEvent, useMemo, useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES } from "@/lib/constants/currencies";
import { formatNumber } from "@/lib/utils";
import AllocationManager from "@/components/allocation-manager";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";
import { EncryptionKeyRequired } from "@/components/encryption-key-required";
import { CheckCircle2, GripVertical, Star, Trash2, WalletCards } from "lucide-react";
import {
  usePools,
  useCreatePool,
  usePermanentDeletePool,
  useFreeBalance,
  useExcludedAccountsBalance,
  useReorderPools,
} from "@/lib/hooks/usePools";
import { useAllocations } from "@/lib/hooks/useAllocations";
import { useActivePoolId, useSetActivePool } from "@/lib/hooks/useUser";

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
  const {
    data: poolsData,
    isLoading: poolsLoading,
    isKeyAvailable,
  } = usePools();
  const { data: allocations = [], isLoading: allocationsLoading } =
    useAllocations();
  const pools = useMemo(() => (poolsData as Pool[]) || [], [poolsData]);
  const { data: freeBalance = 0 } = useFreeBalance();
  const { data: excludedBalance = 0, hasExcludedAccounts = false } =
    useExcludedAccountsBalance();
  const { data: activePoolId = null } = useActivePoolId();

  const createPool = useCreatePool();
  const deletePool = usePermanentDeletePool();
  const reorderPools = useReorderPools();
  const setActivePool = useSetActivePool();

  const [isCreating, setIsCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [draggedPoolId, setDraggedPoolId] = useState<string | null>(null);
  const [dragOverPoolId, setDragOverPoolId] = useState<string | null>(null);
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
  const freePool = pools.find((pool) => pool.type === "free");
  const effectiveActivePoolId = activePoolId || freePool?.id || null;

  // Only show active pools (excluding Free pool since it's shown separately above)
  const displayedPools = useMemo(
    () =>
      pools
        .filter((pool) => pool.is_active && pool.type !== "free")
        .sort((a, b) => {
          const orderDifference = (a.sort_order ?? 0) - (b.sort_order ?? 0);
          if (orderDifference !== 0) return orderDifference;
          return a.created_at.localeCompare(b.created_at);
        }),
    [pools],
  );

  // Show loading state while fetching and decrypting data
  if (poolsLoading || allocationsLoading) {
    return <PoolsSkeleton />;
  }

  if (isKeyAvailable === false) {
    return <EncryptionKeyRequired />;
  }

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
    return poolAllocations.reduce(
      (sum, allocation) => sum + (allocation.amount || 0),
      0,
    );
  };

  const handleSetActivePool = async (poolId: string | null) => {
    if (setActivePool.isPending) return;

    try {
      await setActivePool.mutateAsync(poolId);
    } catch (error: any) {
      console.error("Error setting active pool:", error);
      alert(`Error: ${error.message || "Failed to set active pool"}`);
    }
  };

  const openAllocation = (pool: Pool) => {
    if (isLoading || pool.id.startsWith("temp-")) return;

    setEditingPool({
      id: pool.id,
      name: pool.name || "Unnamed Pool",
      amount: getPoolBalance(pool.id),
    });
  };

  const handleDragStart = (event: DragEvent, poolId: string) => {
    if (poolId.startsWith("temp-")) {
      event.preventDefault();
      return;
    }

    setDraggedPoolId(poolId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", poolId);
  };

  const handleDragOver = (event: DragEvent, poolId: string) => {
    event.preventDefault();
    if (draggedPoolId && draggedPoolId !== poolId) {
      setDragOverPoolId(poolId);
    }
  };

  const handleDrop = async (event: DragEvent, targetPoolId: string) => {
    event.preventDefault();

    const sourcePoolId =
      draggedPoolId || event.dataTransfer.getData("text/plain");
    setDraggedPoolId(null);
    setDragOverPoolId(null);

    if (!sourcePoolId || sourcePoolId === targetPoolId) return;

    const sourceIndex = displayedPools.findIndex(
      (pool) => pool.id === sourcePoolId,
    );
    const targetIndex = displayedPools.findIndex(
      (pool) => pool.id === targetPoolId,
    );

    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextPools = [...displayedPools];
    const [movedPool] = nextPools.splice(sourceIndex, 1);
    nextPools.splice(targetIndex, 0, movedPool);

    try {
      await reorderPools.mutateAsync(nextPools.map((pool) => pool.id));
    } catch (error) {
      console.error("Error reordering pools:", error);
    }
  };

  // Total in Pools = sum of all active pools EXCEPT Free pool (only allocated money)
  const totalBalance = pools
    .filter((p) => p.is_active && p.type !== "free")
    .reduce((sum, pool) => sum + getPoolBalance(pool.id), 0);

  const isLoading = Boolean(
    createPool.isPending || deletePool.isPending || setActivePool.isPending,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-12 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-12 lg:px-8">
        {/* Header */}
        {/* <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Money Pools
          </h1>
        </div> */}

        {/* Total and Free Balance */}
        <div className="mb-4 sm:mb-8 grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="card-glass p-3 sm:p-5">
            <p className="text-xs font-semibold text-muted-foreground">
              Total in Pools
            </p>
            <p className="mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-accent">
              {currencySymbol}
              {formatNumber(totalBalance)}
            </p>
          </div>
          <div className="card-glass p-3 sm:p-5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition rounded-2xl"></div>
            <div className="relative flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-muted-foreground">
                Free Funds
              </p>
              {freePool && (
                <button
                  type="button"
                  onClick={() => handleSetActivePool(null)}
                  disabled={isLoading || effectiveActivePoolId === freePool.id}
                  className={`smooth-transition rounded-lg px-2 py-1 text-xs font-semibold active:scale-95 disabled:opacity-70 ${
                    effectiveActivePoolId === freePool.id
                      ? "bg-green-500 text-white"
                      : "glass hover:shadow-md"
                  }`}
                  title={
                    effectiveActivePoolId === freePool.id
                      ? "Free is active"
                      : "Use Free by default"
                  }
                >
                  {effectiveActivePoolId === freePool.id ? "Active" : "Set active"}
                </button>
              )}
            </div>
            <p className="relative mt-1 sm:mt-2 text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {currencySymbol}
              {formatNumber(freeBalance)}
            </p>
            <p className="relative mt-0.5 sm:mt-2 text-xs text-muted-foreground">
              Available for allocation
            </p>
          </div>
        </div>

        {/* Pools List */}
        {isLoading && displayedPools.length === 0 && !hasExcludedAccounts ? (
          <PoolsSkeleton />
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {/* Virtual Excluded Accounts Pool */}
            {hasExcludedAccounts && (
              <div className="card-glass p-2.5 sm:p-5 border-2 border-orange-200 dark:border-orange-800/50">
                {/* Mobile: Compact layout */}
                <div className="flex sm:hidden items-center gap-2">
                  <div
                    className="h-8 w-8 rounded-full shadow-md shrink-0 flex items-center justify-center"
                    style={{ backgroundColor: "#fb923c" }}
                  >
                    <svg
                      className="h-4 w-4 text-white"
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
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-foreground truncate">
                      Reserved Accounts
                    </h3>
                    <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                      {currencySymbol}
                      {formatNumber(excludedBalance)}
                    </p>
                  </div>
                </div>
                
                {/* Desktop: Original layout */}
                <div className="hidden sm:flex sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div
                      className="h-14 w-14 rounded-full shadow-lg shrink-0 flex items-center justify-center"
                      style={{ backgroundColor: "#fb923c" }}
                    >
                      <svg
                        className="h-7 w-7 text-white"
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
                      <h3 className="text-lg font-bold text-foreground truncate">
                        Reserved Accounts
                      </h3>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Excluded from free funds
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-start gap-2 shrink-0">
                    <div className="text-left">
                      <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                        {currencySymbol}
                        {formatNumber(excludedBalance)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {displayedPools.length === 0 && !hasExcludedAccounts ? (
              <div className="card-glass text-center py-8 sm:py-16">
                <p className="text-sm sm:text-base text-muted-foreground">
                  No pools. Create your first pool.
                </p>
              </div>
            ) : (
              displayedPools.map((pool) => (
                <div
                  key={pool.id}
                  className={`card-glass p-2.5 sm:p-5 cursor-pointer ${
                    draggedPoolId === pool.id ? "opacity-60" : ""
                  } ${
                    dragOverPoolId === pool.id
                      ? "ring-2 ring-accent/60"
                      : ""
                  }`}
                  draggable={!pool.id.startsWith("temp-")}
                  onClick={() => openAllocation(pool)}
                  onDragStart={(event) => handleDragStart(event, pool.id)}
                  onDragOver={(event) => handleDragOver(event, pool.id)}
                  onDrop={(event) => handleDrop(event, pool.id)}
                  onDragEnd={() => {
                    setDraggedPoolId(null);
                    setDragOverPoolId(null);
                  }}
                  title={
                    pool.id.startsWith("temp-")
                      ? "Pool is being created..."
                      : "Open allocation"
                  }
                >
                  {/* Mobile: Single row layout */}
                  <div className="flex sm:hidden items-center gap-2">
                    <button
                      type="button"
                      draggable={false}
                      onClick={(event) => event.stopPropagation()}
                      disabled={pool.id.startsWith("temp-")}
                      className="smooth-transition -ml-1 rounded-md p-1 text-muted-foreground hover:bg-white/10 active:scale-95 cursor-grab disabled:opacity-40"
                      title="Drag to reorder"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <div
                      className="h-8 w-8 rounded-full shadow-md shrink-0"
                      style={{ backgroundColor: pool.color }}
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-bold text-foreground truncate">
                        {pool.name}
                      </h3>
                      <p className="text-xs font-semibold text-accent">
                        {currencySymbol}
                        {formatNumber(getPoolBalance(pool.id))}
                      </p>
                    </div>
                    {/* Mobile actions */}
                    <div className="flex gap-1 shrink-0">
                      <button
                        draggable={false}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleSetActivePool(pool.id);
                        }}
                        disabled={
                          isLoading ||
                          pool.id.startsWith("temp-") ||
                          effectiveActivePoolId === pool.id
                        }
                        className={`smooth-transition rounded-md p-1.5 active:scale-95 disabled:opacity-70 ${
                          effectiveActivePoolId === pool.id
                            ? "bg-green-500 text-white"
                            : "glass hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                        }`}
                        title={
                          effectiveActivePoolId === pool.id
                            ? "Active pool"
                            : "Use by default"
                        }
                      >
                        {effectiveActivePoolId === pool.id ? (
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        ) : (
                          <Star className="h-3.5 w-3.5" />
                        )}
                      </button>
                      {pool.type !== "free" && (
                        <button
                          draggable={false}
                          onClick={(event) => {
                            event.stopPropagation();
                            openAllocation(pool);
                          }}
                          disabled={isLoading || pool.id.startsWith("temp-")}
                          className="smooth-transition rounded-md p-1.5 bg-gradient-to-r from-accent to-accent/80 text-white active:scale-95 disabled:opacity-50"
                          title="Allocate funds"
                        >
                          <WalletCards className="h-3.5 w-3.5" />
                        </button>
                      )}
                      {pool.type !== "free" && (
                        <button
                          draggable={false}
                          onClick={(event) => {
                            event.stopPropagation();
                            setDeleteConfirm({
                              id: pool.id,
                              name: pool.name || "Unnamed Pool",
                            });
                          }}
                          disabled={isLoading}
                          className="smooth-transition rounded-md p-1 glass hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 active:scale-95"
                          title="Delete pool"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Desktop: Original layout */}
                  <div className="hidden sm:flex sm:items-center sm:justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        draggable={false}
                        onClick={(event) => event.stopPropagation()}
                        disabled={pool.id.startsWith("temp-")}
                        className="smooth-transition -ml-2 rounded-lg p-2 text-muted-foreground hover:bg-white/10 active:scale-95 cursor-grab disabled:cursor-not-allowed disabled:opacity-40"
                        title="Drag to reorder"
                      >
                        <GripVertical className="h-5 w-5" />
                      </button>
                      <div
                        className="h-14 w-14 rounded-full shadow-lg shrink-0"
                        style={{ backgroundColor: pool.color }}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate text-lg font-bold text-foreground">
                            {pool.name}
                          </h3>
                          {effectiveActivePoolId === pool.id && (
                            <span className="rounded-full bg-green-500 px-2 py-0.5 text-xs font-bold text-white">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs capitalize text-muted-foreground">
                          {pool.type === "free"
                            ? "Free"
                            : pool.type === "custom"
                              ? "Custom"
                              : pool.type}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="text-left">
                        <p className="text-2xl font-bold text-accent">
                          {currencySymbol}
                          {formatNumber(getPoolBalance(pool.id))}
                        </p>
                      </div>

                      {/* Desktop actions */}
                      <div className="flex gap-3">
                        <button
                          draggable={false}
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSetActivePool(pool.id);
                          }}
                          disabled={
                            isLoading ||
                            pool.id.startsWith("temp-") ||
                            effectiveActivePoolId === pool.id
                          }
                          className={`smooth-transition rounded-lg p-2 active:scale-95 touch-target disabled:opacity-70 ${
                            effectiveActivePoolId === pool.id
                              ? "bg-green-500 text-white"
                              : "glass hover:shadow-md hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600 dark:text-green-400"
                          }`}
                          title={
                            effectiveActivePoolId === pool.id
                              ? "Active pool"
                              : "Use by default"
                          }
                        >
                          {effectiveActivePoolId === pool.id ? (
                            <CheckCircle2 className="h-5 w-5" />
                          ) : (
                            <Star className="h-5 w-5" />
                          )}
                        </button>
                        {pool.type !== "free" && (
                          <button
                            draggable={false}
                            onClick={(event) => {
                              event.stopPropagation();
                              openAllocation(pool);
                            }}
                            disabled={isLoading || pool.id.startsWith("temp-")}
                            className="smooth-transition rounded-xl p-3 bg-gradient-to-r from-accent to-accent/80 text-white hover:shadow-lg active:scale-95 touch-target disabled:opacity-50 disabled:cursor-not-allowed"
                            title={
                              pool.id.startsWith("temp-")
                                ? "Pool is being created..."
                                : "Allocate funds"
                            }
                          >
                            <WalletCards className="h-5 w-5" />
                          </button>
                        )}
                        {pool.type !== "free" && (
                          <button
                            draggable={false}
                            onClick={(event) => {
                              event.stopPropagation();
                              setDeleteConfirm({
                                id: pool.id,
                                name: pool.name || "Unnamed Pool",
                              });
                            }}
                            disabled={isLoading}
                            className="smooth-transition rounded-lg p-2 glass hover:shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 active:scale-95 touch-target disabled:opacity-50"
                            title="Delete pool"
                          >
                            <Trash2 className="h-5 w-5" />
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
        <div className="mt-4 sm:mt-8">
          {!isCreating ? (
            <button
              onClick={() => setIsCreating(true)}
              className="glass-sm w-full smooth-transition rounded-2xl border-2 border-dashed border-accent/30 p-4 sm:p-8 text-center font-semibold text-xs sm:text-sm text-muted-foreground hover:border-accent hover:shadow-md touch-target"
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
