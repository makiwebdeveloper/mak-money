import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  getTotalBalanceInCurrency,
  convertCurrency,
} from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";

export default async function Home() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  const currency = (profile?.default_currency || "USD") as CurrencyCode;

  // Get all active accounts
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // Calculate total balance in user's default currency using real exchange rates
  const totalBalance = await getTotalBalanceInCurrency(
    accounts || [],
    currency,
  );

  // Get free funds balance
  const { data: freePool } = await supabase
    .from("money_pools")
    .select("id")
    .eq("user_id", user.id)
    .eq("type", "free")
    .single();

  let freeBalance = 0;
  if (freePool) {
    // Calculate free balance by converting all amounts to user's currency
    // Get all allocations (excluding free pool)
    const { data: allocations } = await supabase
      .from("allocations")
      .select("amount, accounts(currency)")
      .eq("user_id", user.id)
      .neq("pool_id", freePool.id);

    // Convert all allocations to default currency
    let totalAllocated = 0;
    for (const allocation of allocations || []) {
      const accountCurrency =
        (allocation.accounts as any)?.currency || currency;
      const converted = await convertCurrency(
        allocation.amount,
        accountCurrency as CurrencyCode,
        currency,
      );
      totalAllocated += converted;
    }

    freeBalance = Number((totalBalance - totalAllocated).toFixed(2));
  }

  // Get last 5 transactions
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*, accounts!transactions_account_id_fkey(name, currency)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="min-h-screen bg-linear-to-br from-background to-background/95 pt-28 md:pt-0 pb-24 md:pb-0">
      <div className="mx-auto max-w-7xl px-3 sm:px-4 py-6 sm:py-12 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-12">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold bg-linear-to-r from-foreground via-accent to-foreground bg-clip-text text-transparent mb-1 sm:mb-2">
            Welcome, {profile?.name || user.email}
          </h1>
          <p className="text-xs sm:text-lg text-muted-foreground">
            Main currency:{" "}
            <span className="font-semibold text-accent">{currency}</span>
          </p>
        </div>

        {/* Balances - modern glassmorphism cards */}
        <div className="mb-5 sm:mb-8 grid gap-3 sm:gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Total Balance */}
          <div className="card-glass group relative overflow-hidden p-3 sm:p-4">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                Total Balance
              </div>
              <div className="text-xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                {totalBalance.toFixed(2)}{" "}
                <span className="text-base sm:text-xl text-accent">
                  {currency}
                </span>
              </div>
              <div className="mt-2 sm:mt-4 text-xs text-muted-foreground">
                {accounts?.length || 0}{" "}
                {accounts?.length === 1 ? "account" : "accounts"}
              </div>
            </div>
          </div>

          {/* Free Funds */}
          <div className="card-glass group relative overflow-hidden p-3 sm:p-4">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                Free Funds
              </div>
              <div className="text-xl sm:text-3xl lg:text-4xl font-bold bg-linear-to-r from-foreground to-accent bg-clip-text text-transparent">
                {freeBalance.toFixed(2)}
              </div>
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                Available for expenses
              </div>
            </div>
          </div>

          {/* Allocated */}
          <div className="card-glass group relative overflow-hidden sm:col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 sm:mb-3 text-xs sm:text-sm font-semibold text-muted-foreground">
                Allocated in Pools
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent">
                {(totalBalance - freeBalance).toFixed(2)}
              </div>
              <div className="mt-3 sm:mt-4 text-xs sm:text-sm text-muted-foreground">
                {Math.round(
                  ((totalBalance - freeBalance) / (totalBalance || 1)) * 100,
                )}
                % of total
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div className="card-glass mb-6 sm:mb-8">
            <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                Recent Transactions
              </h2>
              <Link
                href="/transactions"
                className="smooth-transition text-sm font-semibold text-accent hover:text-accent/80"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3 sm:space-y-4">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass-sm flex items-center justify-between rounded-xl p-3 sm:p-4 transition-all hover:bg-white/50 dark:hover:bg-white/15"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div
                      className={`flex h-10 sm:h-11 w-10 sm:w-11 flex-shrink-0 items-center justify-center rounded-full font-bold text-lg backdrop-blur-sm ${
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
                      <div className="font-semibold text-foreground text-sm sm:text-base truncate">
                        {tx.category || "No category"}
                      </div>
                      <div className="text-xs sm:text-sm text-muted-foreground truncate">
                        {tx.accounts?.name} •{" "}
                        {new Date(tx.transaction_date).toLocaleDateString(
                          "ru-RU",
                        )}
                      </div>
                    </div>
                  </div>
                  <div
                    className={`text-base sm:text-lg font-bold flex-shrink-0 ml-2 ${
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

        {/* Quick Actions */}
        <div>
          <h2 className="mb-6 text-xl sm:text-2xl font-bold text-foreground">
            Quick Actions
          </h2>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/pools"
              className="card-glass group flex flex-col p-4 sm:p-5 min-h-24 sm:min-h-28"
            >
              <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-accent smooth-transition">
                Money Pools
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                Allocate funds by goals
              </p>
            </Link>

            <Link
              href="/accounts"
              className="card-glass group flex flex-col p-4 sm:p-5 min-h-24 sm:min-h-28"
            >
              <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-accent smooth-transition">
                Accounts
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                Manage accounts and monitoring
              </p>
            </Link>

            <Link
              href="/transactions"
              className="card-glass group flex flex-col p-4 sm:p-5 min-h-24 sm:min-h-28"
            >
              <h3 className="text-base sm:text-lg font-bold text-foreground group-hover:text-accent smooth-transition">
                Transactions
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-muted-foreground line-clamp-2">
                Operations history
              </p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
