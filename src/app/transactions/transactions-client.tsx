"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { buttonStyles, inputStyles } from "@/lib/styles/components";

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
        return "text-green-600";
      case "expense":
        return "text-red-600";
      case "transfer":
        return "text-blue-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
            <p className="mt-2 text-sm text-gray-600">
              View and add your transactions
            </p>
          </div>
          <button
            onClick={() => setIsCreating((v) => !v)}
            className={
              isCreating ? buttonStyles.secondary : buttonStyles.primary
            }
          >
            {isCreating ? "Cancel" : "+ New Transaction"}
          </button>
        </div>

        {/* Create Transaction Form */}
        {isCreating && (
          <div className="mb-8 rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-xl font-semibold">New Transaction</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Transaction Type */}
              <div>
                <label className="mb-2 block text-sm font-medium">Type</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setType("income")}
                    className={
                      type === "income"
                        ? buttonStyles.success
                        : buttonStyles.secondary
                    }
                  >
                    Income
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("expense")}
                    className={
                      type === "expense"
                        ? buttonStyles.danger
                        : buttonStyles.secondary
                    }
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("transfer")}
                    className={
                      type === "transfer"
                        ? buttonStyles.primary
                        : buttonStyles.secondary
                    }
                  >
                    Transfer
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="mb-2 block text-sm font-medium">Amount</label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={inputStyles.base}
                  placeholder="0.00"
                  required
                />
              </div>

              {/* Account Selection */}
              {type === "transfer" ? (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium">
                      From Account
                    </label>
                    <select
                      value={fromAccountId}
                      onChange={(e) => setFromAccountId(e.target.value)}
                      className={inputStyles.base}
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
                    <label className="mb-2 block text-sm font-medium">
                      To Account
                    </label>
                    <select
                      value={toAccountId}
                      onChange={(e) => setToAccountId(e.target.value)}
                      className={inputStyles.base}
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
                  <label className="mb-2 block text-sm font-medium">
                    Account
                  </label>
                  <select
                    value={accountId}
                    onChange={(e) => setAccountId(e.target.value)}
                    className={inputStyles.base}
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
                <label className="mb-2 block text-sm font-medium">
                  Category (optional)
                </label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={inputStyles.base}
                  placeholder="e.g., Salary, Groceries, etc."
                />
              </div>

              {/* Description (optional) */}
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={inputStyles.base}
                  placeholder="Add notes..."
                  rows={3}
                ></textarea>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full ${buttonStyles.primary}`}
              >
                {isLoading ? "Creating..." : "Create Transaction"}
              </button>
            </form>
          </div>
        )}

        {accounts.length === 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-yellow-800">
            You need to create an account first before adding transactions.
          </div>
        )}

        {/* Transactions List */}
        {transactions.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            No transactions yet
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase text-gray-500">
                    Description
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-900">
                      {formatDate(transaction.transaction_date)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span
                        className={`capitalize ${getTransactionColor(transaction.type)}`}
                      >
                        {transaction.type}
                      </span>
                    </td>
                    <td
                      className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${getTransactionColor(transaction.type)}`}
                    >
                      {getTransactionSign(transaction.type)}
                      {transaction.amount} {transaction.currency}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {transaction.category || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {transaction.description || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
