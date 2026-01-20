"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES } from "@/lib/constants/currencies";
import AllocationManager from "@/components/allocation-manager";
import { PoolsSkeleton } from "@/components/pools-skeleton";

type Pool = Database["public"]["Tables"]["money_pools"]["Row"];

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
  poolBalances,
  currency,
}: PoolsClientProps) {
  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [isCreating, setIsCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [editingPool, setEditingPool] = useState<{
    id: string;
    name: string;
    amount: number;
  } | null>(null);

  const currencySymbol =
    CURRENCIES.find((c) => c.code === currency)?.symbol || "$";

  // Filter pools based on active/archived view
  const displayedPools = pools.filter((pool) =>
    showArchived ? !pool.is_active : pool.is_active,
  );

  const handleCreatePool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPoolName.trim() || isLoading) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/pools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newPoolName,
          type: "custom",
        }),
      });

      if (response.ok) {
        const { pool } = await response.json();
        setPools([...pools, pool]);
        setNewPoolName("");
        setIsCreating(false);
      } else {
        console.error("Failed to create pool");
      }
    } catch (error) {
      console.error("Error creating pool:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeletePool = async (poolId: string, poolType: string) => {
    if (poolType === "free") {
      alert("Cannot delete the Free pool");
      return;
    }

    if (!confirm("Are you sure you want to archive this pool?")) return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/pools/${poolId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPools(
          pools.map((p) => (p.id === poolId ? { ...p, is_active: false } : p)),
        );
      } else {
        console.error("Failed to archive pool");
      }
    } catch (error) {
      console.error("Error archiving pool:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestorePool = async (poolId: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/pools/${poolId}/restore`, {
        method: "POST",
      });

      if (response.ok) {
        const { pool } = await response.json();
        setPools(pools.map((p) => (p.id === poolId ? pool : p)));
      } else {
        console.error("Failed to restore pool");
      }
    } catch (error) {
      console.error("Error restoring pool:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePermanentDelete = async (poolId: string, poolType: string) => {
    if (poolType === "free") {
      alert("Cannot delete the Free pool");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to PERMANENTLY delete this pool? This action cannot be undone!",
      )
    )
      return;

    setIsLoading(true);

    try {
      const response = await fetch(`/api/pools/${poolId}/permanent`, {
        method: "DELETE",
      });

      if (response.ok) {
        setPools(pools.filter((p) => p.id !== poolId));
      } else {
        console.error("Failed to permanently delete pool");
      }
    } catch (error) {
      console.error("Error permanently deleting pool:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get real balance from allocations
  const getPoolBalance = (poolId: string) => {
    const balance = poolBalances.find((b) => b.pool_id === poolId);
    return balance?.total_amount || 0;
  };

  const totalBalance = pools
    .filter((p) => p.is_active)
    .reduce((sum, pool) => sum + getPoolBalance(pool.id), 0);

  const activePools = pools.filter((p) => p.is_active);
  const archivedPools = pools.filter((p) => !p.is_active);

  // Получаем баланс свободных средств
  const freePool = pools.find((p) => p.name === "Свободные");
  const freeBalance = freePool ? getPoolBalance(freePool.id) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent mb-1 sm:mb-2">
            Пулы денег
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            Управление и распределение средств
          </p>
        </div>

        {/* Total and Free Balance */}
        <div className="mb-6 sm:mb-8 grid gap-3 grid-cols-1 sm:grid-cols-2">
          <div className="card-glass p-4 sm:p-5">
            <p className="text-xs sm:text-sm font-semibold text-muted-foreground">
              Всего в пулах
            </p>
            <p className="mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-accent">
              {currencySymbol}
              {totalBalance.toFixed(2)}
            </p>
          </div>
          <div className="card-glass p-4 sm:p-5 group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition rounded-2xl"></div>
            <p className="relative text-xs sm:text-sm font-semibold text-muted-foreground">
              Свободные средства
            </p>
            <p className="relative mt-1.5 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {currencySymbol}
              {freeBalance.toFixed(2)}
            </p>
            <p className="relative mt-1 sm:mt-2 text-xs sm:text-sm text-muted-foreground">
              Доступно для распределения
            </p>
          </div>
        </div>

        {/* Toggle between Active and Archived */}
        <div className="mb-4 sm:mb-6 flex gap-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm touch-target ${
              !showArchived
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md sm:shadow-lg"
                : "glass hover:shadow-md"
            }`}
          >
            Активные ({activePools.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm touch-target ${
              showArchived
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md sm:shadow-lg"
                : "glass hover:shadow-md"
            }`}
          >
            Архивированные ({archivedPools.length})
          </button>
        </div>

        {/* Pools List */}
        {isLoading && displayedPools.length === 0 ? (
          <PoolsSkeleton />
        ) : (
          <div className="space-y-3">
            {displayedPools.length === 0 ? (
              <div className="card-glass text-center py-12 sm:py-16">
                <p className="text-sm sm:text-base text-muted-foreground">
                  {showArchived
                    ? "Нет архивированных пулов"
                    : "Нет активных пулов"}
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
                            ? "Свободные"
                            : pool.type === "custom"
                              ? "Пользовательский"
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

                      {showArchived ? (
                        // Archived pool actions
                        <div className="flex gap-2 sm:gap-3">
                          <button
                            onClick={() => handleRestorePool(pool.id)}
                            disabled={isLoading}
                            className="smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg active:scale-95 touch-target"
                          >
                            Восстановить
                          </button>
                          <button
                            onClick={() =>
                              handlePermanentDelete(pool.id, pool.type)
                            }
                            disabled={isLoading}
                            className="smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg active:scale-95 touch-target"
                          >
                            Удалить
                          </button>
                        </div>
                      ) : (
                        // Active pool actions
                        <div className="flex gap-2 sm:gap-3">
                          {/* Кнопка управления распределением - только для не-free пулов */}
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
                              Распределить
                            </button>
                          )}
                          {pool.type !== "free" && (
                            <button
                              onClick={() =>
                                handleDeletePool(pool.id, pool.type)
                              }
                              disabled={isLoading}
                              className="smooth-transition rounded-xl px-3 sm:px-6 py-2.5 sm:py-3 font-semibold text-xs sm:text-sm glass hover:shadow-md text-foreground touch-target"
                            >
                              Архив
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Create New Pool */}
        {!showArchived && (
          <div className="mt-8">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="glass-sm w-full smooth-transition rounded-2xl border-2 border-dashed border-accent/30 p-6 sm:p-8 text-center font-semibold text-xs sm:text-sm text-muted-foreground hover:border-accent hover:shadow-md touch-target"
              >
                Создать новый пул
              </button>
            ) : (
              <form onSubmit={handleCreatePool} className="card-glass">
                <h3 className="mb-5 sm:mb-6 text-xl sm:text-2xl font-bold text-foreground">
                  Новый пул денег
                </h3>
                <input
                  type="text"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  placeholder="Например: Аренда, Сбережения"
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
                    {isLoading ? "Создание..." : "Создать"}
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
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
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
              window.location.reload();
            }}
          />
        )}
      </div>
    </div>
  );
}
