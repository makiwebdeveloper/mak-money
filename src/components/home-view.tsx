"use client";

import Link from "next/link";
import { CurrencyCode } from "@/lib/constants/currencies";
import { useFreeBalance } from "@/lib/hooks/usePools";
import { useTotalBalance } from "@/lib/hooks/useAccounts";

interface HomeViewProps {
  currency: CurrencyCode;
  totalBalance: number;
  freeBalance: number;
  accountsCount: number;
  recentTransactions: any[];
}

export function HomeView({
  currency,
  totalBalance: initialTotalBalance,
  freeBalance: initialFreeBalance,
  accountsCount: initialAccountsCount,
  recentTransactions,
}: HomeViewProps) {
  // Use react-query hooks for live updates
  const { data: freeBalance = initialFreeBalance } = useFreeBalance();
  const { data: balanceData } = useTotalBalance();
  const totalBalance = balanceData?.totalBalance ?? initialTotalBalance;
  const accountsCount = balanceData?.accountsCount ?? initialAccountsCount;
  return (
    <div className="min-h-full bg-gradient-to-br from-background to-background/95 px-3 sm:px-4 py-6">
      {/* Currency indicator */}
      <div className="mb-4 sm:mb-6 flex items-center justify-end">
        <div className="glass-sm px-3 py-1.5 rounded-full">
          <span className="text-xs font-semibold text-muted-foreground">
            Currency:{" "}
          </span>
          <span className="text-xs font-bold text-accent">{currency}</span>
        </div>
      </div>

      {/* Main Balance Cards */}
      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        {/* Total Balance */}
        <div className="card-glass group relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Total Balance
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
            </div>
            <div className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              {totalBalance.toFixed(2)}
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-accent mb-4">
              {currency}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span>
                {accountsCount} {accountsCount === 1 ? "account" : "accounts"}
              </span>
            </div>
          </div>
        </div>

        {/* Free Funds */}
        <div className="card-glass group relative overflow-hidden p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 via-emerald-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>
          <div className="relative">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">
                Free Funds
              </div>
              <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
            </div>
            <div className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent mb-2">
              {freeBalance.toFixed(2)}
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-accent mb-4">
              {currency}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Available for expenses</span>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-3">
        <div className="card-glass group relative overflow-hidden p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Allocated
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-accent mb-2">
              {(totalBalance - freeBalance).toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">
              {Math.round(
                ((totalBalance - freeBalance) / (totalBalance || 1)) * 100,
              )}
              % in pools
            </div>
          </div>
        </div>

        <div className="card-glass group relative overflow-hidden p-4">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Free %
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {Math.round((freeBalance / (totalBalance || 1)) * 100)}%
            </div>
            <div className="text-xs text-muted-foreground">
              Unallocated funds
            </div>
          </div>
        </div>

        <div className="card-glass group relative overflow-hidden p-4 col-span-2 lg:col-span-1">
          <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
          <div className="relative">
            <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
              Active Accounts
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
              {accountsCount}
            </div>
            <div className="text-xs text-muted-foreground">
              Managing your money
            </div>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      {recentTransactions && recentTransactions.length > 0 && (
        <div className="card-glass mb-6 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-foreground">
              Recent Transactions
            </h2>
          </div>
          <div className="space-y-2">
            {recentTransactions.map((tx) => (
              <div
                key={tx.id}
                className="glass-sm flex items-center justify-between rounded-xl p-2.5 transition-all hover:bg-white/50 dark:hover:bg-white/15"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full font-bold text-base backdrop-blur-sm ${
                      tx.type === "income"
                        ? "bg-green-500/30 text-green-600 dark:text-green-400"
                        : tx.type === "expense"
                          ? "bg-red-500/30 text-red-600 dark:text-red-400"
                          : "bg-blue-500/30 text-blue-600 dark:text-blue-400"
                    }`}
                  >
                    {tx.type === "income"
                      ? "↓"
                      : tx.type === "expense"
                        ? "↑"
                        : "↔"}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-foreground text-xs truncate">
                      {tx.category || "No category"}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tx.accounts?.name} •{" "}
                      {new Date(tx.transaction_date).toLocaleDateString(
                        "ru-RU",
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className={`text-sm font-bold flex-shrink-0 ml-2 ${
                    tx.type === "income"
                      ? "text-green-600 dark:text-green-400"
                      : tx.type === "expense"
                        ? "text-red-600 dark:text-red-400"
                        : "text-blue-600 dark:text-blue-400"
                  }`}
                >
                  {tx.type === "income"
                    ? "+"
                    : tx.type === "expense"
                      ? "-"
                      : ""}
                  {tx.amount.toFixed(2)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
