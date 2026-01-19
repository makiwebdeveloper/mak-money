"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES } from "@/lib/constants/currencies";

type Pool = Database["public"]["Tables"]["money_pools"]["Row"];

interface PoolsClientProps {
  pools: Pool[];
  currency: string;
  userId: string;
}

export default function PoolsClient({
  pools: initialPools,
  currency,
}: PoolsClientProps) {
  const [pools, setPools] = useState<Pool[]>(initialPools);
  const [isCreating, setIsCreating] = useState(false);
  const [newPoolName, setNewPoolName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

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

  // Mock balance (will be real after transactions in Stage 4)
  const getPoolBalance = (poolId: string) => {
    const freePool = pools.find((p) => p.type === "free");
    return poolId === freePool?.id ? 1000 : 0;
  };

  const totalBalance = pools
    .filter((p) => p.is_active)
    .reduce((sum, pool) => sum + getPoolBalance(pool.id), 0);

  const activePools = pools.filter((p) => p.is_active);
  const archivedPools = pools.filter((p) => !p.is_active);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Money Pools</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage how your money is allocated
          </p>
        </div>

        {/* Total Balance */}
        <div className="mb-6 rounded-lg bg-white p-6 shadow">
          <p className="text-sm text-gray-600">Total Balance</p>
          <p className="text-3xl font-bold text-gray-900">
            {currencySymbol}
            {totalBalance.toFixed(2)}
          </p>
        </div>

        {/* Toggle between Active and Archived */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setShowArchived(false)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              !showArchived
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Active ({activePools.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
              showArchived
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-700 hover:bg-gray-100"
            }`}
          >
            Archived ({archivedPools.length})
          </button>
        </div>

        {/* Pools List */}
        <div className="space-y-4">
          {displayedPools.length === 0 ? (
            <div className="rounded-lg bg-white p-12 text-center shadow">
              <p className="text-gray-500">
                {showArchived ? "No archived pools" : "No active pools found"}
              </p>
            </div>
          ) : (
            displayedPools.map((pool) => (
              <div
                key={pool.id}
                className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className="h-12 w-12 rounded-full"
                      style={{ backgroundColor: pool.color }}
                    />
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {pool.name}
                      </h3>
                      <p className="text-sm text-gray-500 capitalize">
                        {pool.type}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {currencySymbol}
                        {getPoolBalance(pool.id).toFixed(2)}
                      </p>
                    </div>

                    {showArchived ? (
                      // Archived pool actions
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRestorePool(pool.id)}
                          disabled={isLoading}
                          className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          Restore
                        </button>
                        <button
                          onClick={() =>
                            handlePermanentDelete(pool.id, pool.type)
                          }
                          disabled={isLoading}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    ) : (
                      // Active pool actions
                      pool.type !== "free" && (
                        <button
                          onClick={() => handleDeletePool(pool.id, pool.type)}
                          disabled={isLoading}
                          className="rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          Archive
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create New Pool - only show when viewing active pools */}
        {!showArchived && (
          <div className="mt-6">
            {!isCreating ? (
              <button
                onClick={() => setIsCreating(true)}
                className="w-full rounded-lg border-2 border-dashed border-gray-300 p-6 text-gray-600 hover:border-gray-400 hover:text-gray-900"
              >
                + Create New Pool
              </button>
            ) : (
              <form
                onSubmit={handleCreatePool}
                className="rounded-lg bg-white p-6 shadow"
              >
                <h3 className="mb-4 font-semibold text-gray-900">
                  Create New Pool
                </h3>
                <input
                  type="text"
                  value={newPoolName}
                  onChange={(e) => setNewPoolName(e.target.value)}
                  placeholder="Pool name (e.g., Rent, Savings, Goals)"
                  className="mb-4 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                  autoFocus
                  disabled={isLoading}
                />
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    disabled={isLoading || !newPoolName.trim()}
                    className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
