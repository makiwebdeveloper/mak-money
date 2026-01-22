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
        {/* Currency indicator - minimal */}
        <div className="mb-4 sm:mb-6 flex items-center justify-end">
          <div className="glass-sm px-3 py-1.5 rounded-full">
            <span className="text-xs font-semibold text-muted-foreground">
              Currency:{" "}
            </span>
            <span className="text-xs font-bold text-accent">{currency}</span>
          </div>
        </div>

        {/* Main Balance Cards - Hero Section */}
        <div className="mb-6 sm:mb-10 grid gap-4 sm:gap-6 lg:grid-cols-2">
          {/* Total Balance - Primary Card */}
          <div className="card-glass group relative overflow-hidden p-6 sm:p-8 lg:p-10 hover:shadow-2xl">
            <div className="absolute inset-0 bg-linear-to-br from-blue-500/20 via-blue-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="mb-3 sm:mb-4 flex items-center gap-2">
                <div className="text-sm sm:text-base font-bold text-muted-foreground uppercase tracking-wider">
                  Total Balance
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold text-foreground mb-2">
                {totalBalance.toFixed(2)}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-accent mb-4 sm:mb-6">
                {currency}
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>
                  {accounts?.length || 0}{" "}
                  {accounts?.length === 1 ? "account" : "accounts"}
                </span>
              </div>
            </div>
          </div>

          {/* Free Funds - Primary Card */}
          <div className="card-glass group relative overflow-hidden p-6 sm:p-8 lg:p-10 hover:shadow-2xl">
            <div className="absolute inset-0 bg-linear-to-br from-green-500/20 via-emerald-400/10 to-transparent opacity-50 group-hover:opacity-75 smooth-transition"></div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/20 rounded-full blur-3xl"></div>
            <div className="relative">
              <div className="mb-3 sm:mb-4 flex items-center gap-2">
                <div className="text-sm sm:text-base font-bold text-muted-foreground uppercase tracking-wider">
                  Free Funds
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-muted-foreground/30 to-transparent"></div>
              </div>
              <div className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold bg-linear-to-r from-green-600 to-emerald-500 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent mb-2">
                {freeBalance.toFixed(2)}
              </div>
              <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-accent mb-4 sm:mb-6">
                {currency}
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Available for expenses</span>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Stats */}
        <div className="mb-6 sm:mb-10 grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
          {/* Allocated */}
          <div className="card-glass group relative overflow-hidden p-4 sm:p-6 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Allocated
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-accent mb-2">
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

          {/* Allocation Percentage */}
          <div className="card-glass group relative overflow-hidden p-4 sm:p-6">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Free %
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {Math.round((freeBalance / (totalBalance || 1)) * 100)}%
              </div>
              <div className="text-xs text-muted-foreground">
                Unallocated funds
              </div>
            </div>
          </div>

          {/* Accounts Count - Mobile Hidden on small screens */}
          <div className="card-glass group relative overflow-hidden p-4 sm:p-6 col-span-2 lg:col-span-1">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 smooth-transition"></div>
            <div className="relative">
              <div className="mb-2 text-xs font-semibold text-muted-foreground uppercase">
                Active Accounts
              </div>
              <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {accounts?.length || 0}
              </div>
              <div className="text-xs text-muted-foreground">
                Managing your money
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {recentTransactions && recentTransactions.length > 0 && (
          <div className="card-glass mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="mb-3 sm:mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <h2 className="text-lg sm:text-xl font-bold text-foreground">
                Recent Transactions
              </h2>
              <Link
                href="/transactions"
                className="smooth-transition text-xs sm:text-sm font-semibold text-accent hover:text-accent/80"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-2 sm:space-y-3">
              {recentTransactions.map((tx) => (
                <div
                  key={tx.id}
                  className="glass-sm flex items-center justify-between rounded-xl p-2.5 sm:p-3 transition-all hover:bg-white/50 dark:hover:bg-white/15"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className={`flex h-9 sm:h-10 w-9 sm:w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-base backdrop-blur-sm ${
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
                      <div className="font-semibold text-foreground text-xs sm:text-sm truncate">
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
                    className={`text-sm sm:text-base font-bold flex-shrink-0 ml-2 ${
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
          <h2 className="mb-4 text-lg sm:text-xl font-bold text-foreground">
            Quick Actions
          </h2>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/pools"
              className="card-glass group flex items-center justify-center p-4 sm:p-5 min-h-16 sm:min-h-20"
            >
              <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-accent smooth-transition">
                Money Pools
              </h3>
            </Link>

            <Link
              href="/accounts"
              className="card-glass group flex items-center justify-center p-4 sm:p-5 min-h-16 sm:min-h-20"
            >
              <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-accent smooth-transition">
                Accounts
              </h3>
            </Link>

            <Link
              href="/transactions"
              className="card-glass group flex items-center justify-center p-4 sm:p-5 min-h-16 sm:min-h-20"
            >
              <h3 className="text-sm sm:text-base font-bold text-foreground group-hover:text-accent smooth-transition">
                Transactions
              </h3>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
