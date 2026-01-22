"use client";

import { useState, useEffect } from "react";
import { buttonStyles, inputStyles } from "@/lib/styles/components";

interface AllocationManagerProps {
  poolId: string;
  poolName: string;
  currentAmount: number;
  freeBalance: number;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AllocationManager({
  poolId,
  poolName,
  currentAmount,
  freeBalance,
  onClose,
  onSuccess,
}: AllocationManagerProps) {
  const [amount, setAmount] = useState(currentAmount.toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const newAmount = Number(amount);
    const difference = newAmount - currentAmount;

    if (newAmount < 0) {
      alert("Amount cannot be negative");
      return;
    }

    // If increasing amount, check free funds
    if (difference > 0 && difference > freeBalance) {
      alert(
        `Insufficient free funds!\nAvailable: ${freeBalance.toFixed(2)}\nRequired: ${difference.toFixed(2)}`,
      );
      return;
    }

    setIsLoading(true);

    try {
      // Get first account (can improve account selection logic)
      if (accounts.length === 0) {
        alert("Create an account first");
        return;
      }

      const account = accounts[0];

      const response = await fetch("/api/allocations/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_id: account.id,
          pool_id: poolId,
          new_amount: newAmount,
        }),
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error updating allocation:", error);
      alert("Failed to update allocation");
    } finally {
      setIsLoading(false);
    }
  };

  const difference = Number(amount) - currentAmount;
  const newFreeBalance = freeBalance - difference;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Allocate Funds</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-4 rounded-lg bg-blue-50 p-4">
          <div className="mb-2 text-sm font-medium text-blue-900">
            📊 {poolName}
          </div>
          <div className="text-xs text-blue-700">
            Current amount: <strong>{currentAmount.toFixed(2)}</strong>
          </div>
          <div className="text-xs text-blue-700">
            Free funds: <strong>{freeBalance.toFixed(2)}</strong>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block text-sm font-medium text-gray-700"
            >
              New amount in pool
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={inputStyles.base}
              placeholder="0.00"
              required
            />
          </div>

          {/* Preview changes */}
          {difference !== 0 && (
            <div
              className={`rounded-lg p-3 ${
                difference > 0
                  ? "bg-orange-50 text-orange-900"
                  : "bg-green-50 text-green-900"
              }`}
            >
              <div className="mb-1 text-sm font-medium">
                {difference > 0 ? "📤 From free" : "📥 To free"}:{" "}
                <strong>{Math.abs(difference).toFixed(2)}</strong>
              </div>
              <div className="text-xs opacity-75">
                Free after operation:{" "}
                <strong>{newFreeBalance.toFixed(2)}</strong>
              </div>
              {newFreeBalance < 0 && (
                <div className="mt-1 text-xs font-medium text-red-600">
                  ⚠️ Insufficient funds!
                </div>
              )}
            </div>
          )}

          {/* Quick buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setAmount("0.00")}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() =>
                setAmount((currentAmount + freeBalance).toFixed(2))
              }
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              All
            </button>
            <button
              type="button"
              onClick={() =>
                setAmount((currentAmount + freeBalance / 2).toFixed(2))
              }
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              +50%
            </button>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className={buttonStyles.secondary + " flex-1"}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={buttonStyles.primary + " flex-1"}
              disabled={isLoading || newFreeBalance < 0}
            >
              {isLoading ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
