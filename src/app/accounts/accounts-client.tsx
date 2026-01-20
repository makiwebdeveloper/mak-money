"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES, CurrencyCode } from "@/lib/constants/currencies";
import { buttonStyles, inputStyles } from "@/lib/styles/components";

type Account = Database["public"]["Tables"]["accounts"]["Row"];
type AccountType = Database["public"]["Tables"]["accounts"]["Row"]["type"];

interface AccountsClientProps {
  initialAccounts: Account[];
}

export default function AccountsClient({
  initialAccounts,
}: AccountsClientProps) {
  const [accounts, setAccounts] = useState<Account[]>(initialAccounts);
  const [loading, setLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    type: "other" as AccountType,
    currency: "USD" as CurrencyCode,
    balance: 0,
  });

  const refetchAccounts = async () => {
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await refetchAccounts();
        setFormData({ name: "", type: "other", currency: "USD", balance: 0 });
        setIsCreating(false);
      }
    } catch (error) {
      console.error("Error creating account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Account>) => {
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await refetchAccounts();
        setEditingId(null);
      }
    } catch (error) {
      console.error("Error updating account:", error);
    }
  };

  const handleArchive = async (id: string) => {
    if (!confirm("Archive this account?")) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAccounts(
          accounts.map((a) => (a.id === id ? { ...a, is_active: false } : a)),
        );
      }
    } catch (error) {
      console.error("Error archiving account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}/restore`, {
        method: "POST",
      });

      if (response.ok) {
        const { account } = await response.json();
        setAccounts(accounts.map((a) => (a.id === id ? account : a)));
      } else {
        console.error("Failed to restore account");
      }
    } catch (error) {
      console.error("Error restoring account:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to PERMANENTLY delete this account? This action cannot be undone!",
      )
    )
      return;

    setLoading(true);
    try {
      const response = await fetch(`/api/accounts/${id}?permanent=true`, {
        method: "DELETE",
      });

      if (response.ok) {
        setAccounts(accounts.filter((a) => a.id !== id));
      } else {
        console.error("Failed to permanently delete account");
      }
    } catch (error) {
      console.error("Error permanently deleting account:", error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const activeAccounts = accounts.filter((a) => a.is_active);
  const archivedAccounts = accounts.filter((a) => !a.is_active);
  const displayedAccounts = showArchived ? archivedAccounts : activeAccounts;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Accounts</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage your bank accounts and balances
          </p>
        </div>

        {/* Toggle between Active and Archived */}
        <div className="mb-6 flex space-x-2">
          <button
            onClick={() => setShowArchived(false)}
            className={
              !showArchived ? buttonStyles.primary : buttonStyles.ghost
            }
          >
            Active ({activeAccounts.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={showArchived ? buttonStyles.primary : buttonStyles.ghost}
          >
            Archived ({archivedAccounts.length})
          </button>
        </div>

        {/* Create Form or Accounts List */}
        {!showArchived && isCreating ? (
          <form
            onSubmit={handleCreate}
            className="mb-6 rounded-lg bg-white p-6 shadow"
          >
            <h3 className="mb-4 font-semibold text-gray-900">
              Create New Account
            </h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Main Card, Savings Account"
                  className={inputStyles.base}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as AccountType,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  <option value="bank">Bank</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Currency
                </label>
                <select
                  value={formData.currency}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      currency: e.target.value as CurrencyCode,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                />
              </div>
            </div>
            <div className="mt-4 flex space-x-3">
              <button
                type="submit"
                className="flex-1 rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading}
              >
                {loading ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Accounts List */}
            <div className="space-y-4">
              {displayedAccounts.length === 0 ? (
                <div className="rounded-lg bg-white p-12 text-center shadow">
                  <p className="text-gray-500">
                    {showArchived
                      ? "No archived accounts"
                      : "No accounts yet. Create your first account."}
                  </p>
                </div>
              ) : (
                displayedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {account.name}
                        </h3>
                        <p className="mt-1 text-sm capitalize text-gray-500">
                          {account.type} • {account.currency}
                        </p>
                        <p className="mt-2 text-2xl font-bold text-gray-900">
                          {getCurrencySymbol(account.currency)}{" "}
                          {account.balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {showArchived ? (
                        // Archived account actions
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleRestore(account.id)}
                            disabled={loading}
                            className={buttonStyles.success}
                          >
                            Restore
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(account.id)}
                            disabled={loading}
                            className={buttonStyles.danger}
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        // Active account actions
                        <button
                          onClick={() => handleArchive(account.id)}
                          disabled={loading}
                          className={buttonStyles.dangerSmall}
                        >
                          Archive
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Account Button - only show when viewing active accounts */}
            {!showArchived && (
              <div className="mt-6">
                <button
                  onClick={() => setIsCreating(true)}
                  className={buttonStyles.primary}
                >
                  + Create New Account
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
