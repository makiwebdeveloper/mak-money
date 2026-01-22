"use client";

import { useState, useEffect } from "react";
import { Database } from "@/lib/types/database";

type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function QuickTransactionModal({
  isOpen,
  onClose,
}: QuickTransactionModalProps) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [freeBalance, setFreeBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      fetchAccounts();
      fetchFreeBalance();
    }
  }, [isOpen]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      if (response.ok) {
        const data = await response.json();
        setAccounts(data.accounts);
        if (data.accounts.length > 0) {
          setAccountId(data.accounts[0].id);
        }
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchFreeBalance = async () => {
    try {
      const response = await fetch("/api/pools/balance");
      if (response.ok) {
        const data = await response.json();
        setFreeBalance(data.freeBalance);
      }
    } catch (error) {
      console.error("Error fetching free balance:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    const amountValue = Number(amount);

    if (!amount || amountValue <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (!accountId) {
      alert("Please select an account");
      return;
    }

    // Check free funds for expenses
    if (type === "expense" && amountValue > freeBalance) {
      const shouldContinue = confirm(
        `⚠️ Insufficient free funds!\n\n` +
          `Available: ${freeBalance.toFixed(2)}\n` +
          `Required: ${amountValue.toFixed(2)}\n\n` +
          `Move money from pools to "Free" or continue at your own risk.`,
      );
      if (!shouldContinue) return;
    }

    setIsLoading(true);

    try {
      const selectedAccount = accounts.find((a) => a.id === accountId);

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: amountValue,
          currency: selectedAccount?.currency || "USD",
          account_id: accountId,
          category: category || undefined,
          description: description || undefined,
        }),
      });

      if (response.ok) {
        setAmount("");
        setCategory("");
        setDescription("");
        onClose();
        window.location.reload();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Failed to create transaction");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="backdrop-blur-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <div
        className="glass-lg w-full sm:max-w-md rounded-2xl sm:rounded-2xl p-4 sm:p-8 shadow-2xl modal-animate max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
          <h2 className="text-lg sm:text-2xl font-bold bg-linear-to-r from-foreground to-accent bg-clip-text text-transparent">
            Quick Transaction
          </h2>
          <button
            onClick={onClose}
            className="smooth-transition rounded-lg p-1 text-foreground hover:bg-white/30 dark:hover:bg-white/10 flex-shrink-0"
          >
            <svg
              className="h-5 w-5 sm:h-6 sm:w-6"
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

        {type === "expense" && freeBalance >= 0 && (
          <div className="glass mb-4 sm:mb-5 rounded-lg p-2 sm:p-3 border border-accent/20">
            <p className="text-xs text-foreground">
              Free:{" "}
              <span className="font-bold text-accent text-sm">
                {freeBalance.toFixed(2)}
              </span>
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
          {/* Transaction Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold text-foreground">
              Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`smooth-transition rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm ${
                  type === "income"
                    ? "bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
                    : "glass hover:shadow-md"
                }`}
              >
                Income
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`smooth-transition rounded-lg px-2 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm ${
                  type === "expense"
                    ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                    : "glass hover:shadow-md"
                }`}
              >
                Expense
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="amount"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Amount *
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="glass-sm mobile-input w-full rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="0.00"
              required
            />
          </div>

          {/* Account */}
          <div>
            <label
              htmlFor="account"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Account *
            </label>
            <select
              id="account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="glass-sm mobile-input w-full rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              required
            >
              <option value="">Select account</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.balance} {account.currency})
                </option>
              ))}
            </select>
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="category"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Category
            </label>
            <input
              id="category"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="glass-sm mobile-input w-full rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Food, transport..."
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="mb-1.5 block text-xs font-semibold text-foreground"
            >
              Description
            </label>
            <input
              id="description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="glass-sm mobile-input w-full rounded-lg px-3 py-2 sm:py-2.5 text-sm sm:text-base text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="Optional"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-3 sm:pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 smooth-transition rounded-lg bg-white/50 dark:bg-white/8 px-3 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm text-foreground hover:shadow-lg active:scale-95 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 smooth-transition rounded-lg bg-linear-to-r from-accent to-accent/80 px-3 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm text-white hover:shadow-lg active:scale-95 disabled:opacity-50"
              disabled={isLoading}
            >
              {isLoading ? "Creating..." : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
