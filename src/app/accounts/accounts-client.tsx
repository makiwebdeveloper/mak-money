"use client";

import { useState } from "react";
import { Database } from "@/lib/types/database";
import { CURRENCIES, CurrencyCode } from "@/lib/constants/currencies";

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
    <div className="min-h-screen bg-gradient-to-br from-background to-background/95 p-3 sm:p-4 md:p-6 pt-32 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent mb-1 sm:mb-2">
            Счета
          </h1>
          <p className="text-xs sm:text-base text-muted-foreground">
            Управление банковскими счетами
          </p>
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
            Активные ({activeAccounts.length})
          </button>
          <button
            onClick={() => setShowArchived(true)}
            className={`smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-6 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm touch-target ${
              showArchived
                ? "bg-gradient-to-r from-primary to-primary/80 text-white shadow-md sm:shadow-lg"
                : "glass hover:shadow-md"
            }`}
          >
            Архивированные ({archivedAccounts.length})
          </button>
        </div>

        {/* Create Form or Accounts List */}
        {!showArchived && isCreating ? (
          <form
            onSubmit={handleCreate}
            className="card-glass mb-6 sm:mb-8"
          >
            <h3 className="mb-4 sm:mb-6 text-lg sm:text-2xl font-bold text-foreground">
              Создать счет
            </h3>
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
                  Имя
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Например, Основная карта"
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
                  Тип
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
                  <option value="bank">Банк</option>
                  <option value="crypto">Крипто</option>
                  <option value="other">Прочее</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 sm:mb-2 block text-xs font-semibold text-foreground">
                  Валюта
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
                  Начальный баланс
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
                  className="glass-sm mobile-input w-full rounded-lg sm:rounded-xl px-3 py-2 sm:py-2.5 text-xs sm:text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-5 flex gap-2">
              <button
                type="submit"
                className="flex-1 smooth-transition rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent/80 px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs sm:text-sm text-white hover:shadow-lg active:scale-95 disabled:opacity-50 touch-target"
                disabled={loading}
              >
                {loading ? "Создание..." : "Создать"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex-1 smooth-transition rounded-lg sm:rounded-xl glass hover:shadow-md text-foreground font-semibold text-xs sm:text-sm touch-target"
              >
                Отмена
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Accounts List */}
            <div className="space-y-3">
              {displayedAccounts.length === 0 ? (
                <div className="card-glass text-center py-16">
                  <p className="text-lg text-muted-foreground">
                    {showArchived
                      ? "Нет архивированных счетов"
                      : "Нет счетов. Создайте свой первый счет."}
                  </p>
                </div>
              ) : (
                displayedAccounts.map((account) => (
                  <div
                    key={account.id}
                    className="card-glass p-3 sm:p-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base sm:text-lg font-bold text-foreground truncate">
                          {account.name}
                        </h3>
                        <p className="mt-0.5 sm:mt-1 text-xs capitalize text-muted-foreground">
                          {account.type === 'bank' ? 'Банк' : account.type === 'crypto' ? 'Крипто' : 'Прочее'} • {account.currency}
                        </p>
                        <p className="mt-1.5 sm:mt-2 text-xl sm:text-2xl font-bold text-accent">
                          {getCurrencySymbol(account.currency)}{" "}
                          {account.balance.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                      {showArchived ? (
                        // Archived account actions
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleRestore(account.id)}
                            disabled={loading}
                            className="smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs bg-gradient-to-r from-green-500 to-green-600 text-white hover:shadow-lg active:scale-95 touch-target"
                          >
                            Восстановить
                          </button>
                          <button
                            onClick={() => handlePermanentDelete(account.id)}
                            disabled={loading}
                            className="smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs bg-gradient-to-r from-red-500 to-red-600 text-white hover:shadow-lg active:scale-95 touch-target"
                          >
                            Удалить
                          </button>
                        </div>
                      ) : (
                        // Active account actions
                        <button
                          onClick={() => handleArchive(account.id)}
                          disabled={loading}
                          className="smooth-transition rounded-lg sm:rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 font-semibold text-xs glass hover:shadow-md text-foreground flex-shrink-0 touch-target"
                        >
                          Архивировать
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Create New Account Button */}
            {!showArchived && (
              <div className="mt-6 sm:mt-8">
                <button
                  onClick={() => setIsCreating(true)}
                  className="w-full smooth-transition rounded-lg sm:rounded-xl bg-gradient-to-r from-accent to-accent/80 px-3 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-semibold text-white hover:shadow-lg active:scale-95 touch-target"
                >
                  Создать счет
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
