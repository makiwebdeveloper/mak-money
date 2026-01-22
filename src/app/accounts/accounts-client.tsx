"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES, CurrencyCode } from "@/lib/constants/currencies";
import { AccountsSkeleton } from "@/components/accounts-skeleton";
import ConfirmDeleteModal from "@/components/confirm-delete-modal";
import {
  useAccounts,
  useCreateAccount,
  useUpdateAccount,
  usePermanentDeleteAccount,
} from "@/lib/hooks/useAccounts";

type Account = Database["public"]["Tables"]["accounts"]["Row"] & {
  convertedBalance?: number;
  defaultCurrency?: string;
};
type AccountType = Database["public"]["Tables"]["accounts"]["Row"]["type"];

interface AccountsClientProps {
  initialAccounts: Account[];
  defaultCurrency: string;
}

export default function AccountsClient({
  initialAccounts,
  defaultCurrency,
}: AccountsClientProps) {
  // Use react-query hooks
  const { data: accounts = initialAccounts, isLoading } = useAccounts();
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const deleteAccount = usePermanentDeleteAccount();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    type: "other" as AccountType,
    currency: (defaultCurrency || "USD") as CurrencyCode,
    balance: 0,
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await createAccount.mutateAsync(formData);
      setFormData({ name: "", type: "other", currency: "USD", balance: 0 });
      setIsCreating(false);
    } catch (error) {
      console.error("Error creating account:", error);
      alert("Failed to create account");
    }
  };

  const handleUpdate = async (id: string, updates: Partial<Account>) => {
    try {
      await updateAccount.mutateAsync({ id, updates });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating account:", error);
      alert("Failed to update account");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await deleteAccount.mutateAsync(deleteConfirm.id);
      setDeleteConfirm(null);
    } catch (error) {
      console.error("Error deleting account:", error);
      alert("Failed to delete account");
    }
  };

  const getCurrencySymbol = (code: string) => {
    return CURRENCIES.find((c) => c.code === code)?.symbol || code;
  };

  const loading = Boolean(
    isLoading ||
    createAccount.isPending ||
    updateAccount.isPending ||
    deleteAccount.isPending,
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 pt-12 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header */}
        {/* <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Accounts
          </h1>
        </div> */}

        {/* Create Form or Accounts List */}
        {isCreating ? (
          <form onSubmit={handleCreate} className="card-glass mb-6 sm:mb-8">
            <h3 className="mb-4 sm:mb-6 text-lg sm:text-2xl font-bold text-foreground">
              Create Account
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Main Card"
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
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
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  <option value="bank">Bank</option>
                  <option value="crypto">Crypto</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
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
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                >
                  {CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
                  Initial Balance
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      balance: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="Enter balance (optional)"
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-5 flex gap-2">
              <button
                type="submit"
                className="flex-1 smooth-transition rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent/80 px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm text-white hover:shadow-lg active:scale-95 disabled:opacity-50 touch-target"
                disabled={createAccount.isPending}
              >
                {createAccount.isPending ? "Creating..." : "Create"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 smooth-transition rounded-lg sm:rounded-xl glass hover:shadow-md text-foreground font-semibold text-xs sm:text-sm touch-target"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Loading state */}
            {isLoading && accounts.length === 0 ? (
              <AccountsSkeleton />
            ) : (
              <div className="space-y-3">
                {accounts.length === 0 ? (
                  <div className="card-glass text-center py-16">
                    <p className="text-lg text-muted-foreground">
                      No accounts. Create your first account.
                    </p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <div key={account.id} className="card-glass p-3 sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                            {account.name}
                          </h3>
                          <p className="mt-0.5 sm:mt-1 text-xs capitalize text-muted-foreground">
                            {account.type === "bank"
                              ? "Bank"
                              : account.type === "crypto"
                                ? "Crypto"
                                : "Other"}{" "}
                            • {account.currency}
                          </p>
                          <div className="mt-1.5 sm:mt-2">
                            <p className="text-xl sm:text-2xl font-bold text-accent">
                              {getCurrencySymbol(account.currency)}{" "}
                              {account.balance.toLocaleString("en-US", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </p>
                            {account.currency !== defaultCurrency &&
                              account.convertedBalance !== undefined && (
                                <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                                  ≈ {getCurrencySymbol(defaultCurrency)}{" "}
                                  {account.convertedBalance.toLocaleString(
                                    "en-US",
                                    {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    },
                                  )}{" "}
                                  ({defaultCurrency})
                                </p>
                              )}
                          </div>
                        </div>
                        {/* Delete button - always on the right */}
                        <button
                          onClick={() =>
                            setDeleteConfirm({
                              id: account.id,
                              name: account.name,
                            })
                          }
                          disabled={loading}
                          className="smooth-transition rounded-lg p-2 glass hover:shadow-md hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600 active:scale-95 touch-target disabled:opacity-50"
                          title="Delete account"
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
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Create New Account Button */}
            <div className="mt-6 sm:mt-8">
              <button
                onClick={() => setIsCreating(true)}
                className="w-full smooth-transition rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent/80 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white hover:shadow-lg active:scale-95 touch-target"
              >
                Create Account
              </button>
            </div>
          </>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmDeleteModal
          isOpen={!!deleteConfirm}
          title="Delete Account"
          message={`Are you sure you want to delete "${deleteConfirm?.name}"? This action cannot be undone and will remove all associated data.`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirm(null)}
          isDeleting={deleteAccount.isPending}
        />
      </div>
    </div>
  );
}
