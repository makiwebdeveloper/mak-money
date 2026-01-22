"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { TransactionsSkeleton } from "@/components/transactions-skeleton";

type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
type Account = Database["public"]["Tables"]["accounts"]["Row"];

interface TransactionsClientProps {
  initialTransactions: Transaction[];
  accounts: Account[];
}

export default function TransactionsClient({
  initialTransactions,
  accounts,
}: TransactionsClientProps) {
  const [transactions, setTransactions] =
    useState<Transaction[]>(initialTransactions);
  const [type, setType] = useState<"income" | "expense" | "transfer">("income");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (type === "transfer") {
      if (!fromAccountId || !toAccountId) {
        alert("Please select both accounts for transfer");
        return;
      }
      if (fromAccountId === toAccountId) {
        alert("Cannot transfer to the same account");
        return;
      }
    } else {
      if (!accountId) {
        alert("Please select an account");
        return;
      }
    }

    setIsLoading(true);

    try {
      const selectedAccount = accounts.find((a) =>
        type === "transfer" ? a.id === fromAccountId : a.id === accountId,
      );

      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount: Number(amount),
          currency: selectedAccount?.currency || "USD",
          account_id: type === "transfer" ? undefined : accountId,
          from_account_id: type === "transfer" ? fromAccountId : undefined,
          to_account_id: type === "transfer" ? toAccountId : undefined,
          category: category || undefined,
          description: description || undefined,
        }),
      });

      if (response.ok) {
        const { transaction } = await response.json();
        setTransactions([transaction, ...transactions]);
        setAmount("");
        setCategory("");
        setDescription("");
        setIsCreating(false);
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTransactionSign = (type: string) => {
    switch (type) {
      case "income":
        return "+";
      case "expense":
        return "-";
      case "transfer":
        return "→";
      default:
        return "";
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case "income":
        return "text-green-600 dark:text-green-400";
      case "expense":
        return "text-red-600 dark:text-red-400";
      case "transfer":
        return "text-accent";
      default:
        return "text-foreground";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent mb-1 sm:mb-2">
              Transactions
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground">
              View and add operations
            </p>
          </div>
          <button
            onClick={() => setIsCreating((v) => !v)}
            className={`smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-2.5 font-semibold whitespace-nowrap text-xs sm:text-sm touch-target ${
              isCreating
                ? "glass hover:shadow-md text-foreground"
                : "bg-gradient-to-r from-accent to-accent/80 text-white hover:shadow-lg active:scale-95"
            }`}
          >
            {isCreating ? "Cancel" : "New Transaction"}
          </button>
        </div>

        {/* Create Transaction Form */}
        {isCreating && (
          <div className="card-glass mb-8">
            <h2 className="mb-3 sm:mb-4 text-lg sm:text-2xl font-bold text-foreground">
              New Transaction
            </h2>
            <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                  Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={`smooth-transition rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-xs touch-target ${
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
                    className={`smooth-transition rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-xs touch-target ${
                      type === "expense"
                        ? "bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg shadow-red-500/30"
                        : "glass hover:shadow-md"
                    }`}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("transfer")}
                    className={`smooth-transition rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 font-semibold text-xs touch-target ${
                      type === "transfer"
                        ? "bg-gradient-to-br from-accent to-accent/80 text-white shadow-lg shadow-accent/30"
                        : "glass hover:shadow-md"
                    }`}
                  >
                    Transfer
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                  Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Account Selection */}
              {type === "transfer" ? (
                <>
                  <div>
                    <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                      From Account
                    </label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency}{" "}
                          {account.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                      To Account
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                      required
                    >
                      <option value="">Select account</option>
                      {accounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({account.currency}{" "}
                          {account.balance.toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                    Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="glass-sm mobile-input w-full rounded-xl px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                    required
                  >
                    <option value="">Select account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({account.currency}{" "}
                        {account.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category (optional) */}
              <div>
                <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                  Category
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="glass-sm mobile-input w-full rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Salary, Groceries..."
                />
              </div>

              {/* Description (optional) */}
              <div>
                <label className="mb-2 sm:mb-3 block text-xs sm:text-sm font-semibold text-foreground">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="glass-sm mobile-input w-full rounded-xl px-4 py-3 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  placeholder="Add notes..."
                  rows={2}
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full smooth-transition rounded-xl bg-gradient-to-r from-accent to-accent/80 px-4 py-2.5 sm:py-3 font-semibold text-sm sm:text-base text-white hover:shadow-lg active:scale-95 disabled:opacity-50 touch-target"
              >
                {isLoading ? "Creating..." : "Create Transaction"}
              </button>
            </form>
          </div>
        )}

        {accounts.length === 0 && (
          <div className="glass border-l-4 border-accent rounded-xl p-3 sm:p-4 mb-6">
            <p className="text-foreground font-semibold text-sm sm:text-base">
              ⚠️ Create an account first
            </p>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Go to accounts page to add your first account.
            </p>
          </div>
        )}

        {/* Transactions List */}
        {isLoading && transactions.length === 0 ? (
          <TransactionsSkeleton />
        ) : transactions.length === 0 ? (
          <div className="card-glass py-12 sm:py-16 text-center text-xs sm:text-base text-muted-foreground">
            No transactions yet
          </div>
        ) : (
          <div className="card-glass overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gradient-to-r from-primary/10 to-accent/10 border-b border-white/20">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                      Type
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                      Category
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-bold uppercase text-foreground">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {transactions.map((transaction) => (
                    <tr
                      key={transaction.id}
                      className="hover:bg-white/5 smooth-transition"
                    >
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {formatDate(transaction.transaction_date)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <span
                          className={`capitalize font-semibold ${getTransactionColor(transaction.type)}`}
                        >
                          {transaction.type === "income"
                            ? "✅ Income"
                            : transaction.type === "expense"
                              ? "❌ Expense"
                              : "→ Transfer"}
                        </span>
                      </td>
                      <td
                        className={`whitespace-nowrap px-6 py-4 text-sm font-bold ${getTransactionColor(transaction.type)}`}
                      >
                        {getTransactionSign(transaction.type)}
                        {transaction.amount} {transaction.currency}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-muted-foreground">
                        {transaction.category || "-"}
                      </td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">
                        {transaction.description || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
