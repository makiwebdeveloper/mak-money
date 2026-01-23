import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  getTotalBalanceInCurrency,
  convertCurrency,
} from "@/lib/constants/exchange-rates";
import { CurrencyCode } from "@/lib/constants/currencies";
import { UnifiedSwipeableView } from "@/components/unified-swipeable-view";
import { HomeView } from "@/components/home-view";
import AccountsClient from "./accounts/accounts-client";
import PoolsClient from "./pools/pools-client";
import TransactionsClient from "./transactions/transactions-client";
import { AccountsSkeleton } from "@/components/accounts-skeleton";
import { PoolsSkeleton } from "@/components/pools-skeleton";
import { TransactionsSkeleton } from "@/components/transactions-skeleton";

async function AllContent() {
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
    // Get accounts that are NOT excluded from free balance calculation
    const accountsForFreeBalance =
      accounts?.filter((acc) => !acc.exclude_from_free) || [];

    // Calculate total balance for non-excluded accounts
    const totalAccountBalance = await getTotalBalanceInCurrency(
      accountsForFreeBalance,
      currency,
    );

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

    freeBalance = Number((totalAccountBalance - totalAllocated).toFixed(2));
  }

  // Get last 5 transactions
  const { data: recentTransactions } = await supabase
    .from("transactions")
    .select("*, accounts!transactions_account_id_fkey(name, currency)")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(5);

  // Load data for Accounts page
  const { data: allAccounts } = await supabase
    .from("accounts")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const accountsWithConversion = await Promise.all(
    (allAccounts || []).map(async (account) => {
      const convertedBalance = await convertCurrency(
        account.balance,
        account.currency as CurrencyCode,
        currency,
      );
      return {
        ...account,
        convertedBalance,
        defaultCurrency: currency,
      };
    }),
  );

  // Load data for Pools page
  const { data: pools } = await supabase
    .from("money_pools")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  // Load data for Transactions page
  const { data: allTransactions } = await supabase
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("transaction_date", { ascending: false });

  return (
    <UnifiedSwipeableView
      homeContent={
        <HomeView
          currency={currency}
          totalBalance={totalBalance}
          freeBalance={freeBalance}
          accountsCount={accounts?.length || 0}
          recentTransactions={recentTransactions || []}
        />
      }
      accountsContent={
        <AccountsClient
          initialAccounts={accountsWithConversion}
          defaultCurrency={currency}
        />
      }
      poolsContent={
        <PoolsClient
          pools={pools || []}
          poolBalances={[]}
          currency={currency}
          userId={user.id}
        />
      }
      transactionsContent={
        <TransactionsClient
          initialTransactions={allTransactions || []}
          accounts={allAccounts || []}
        />
      }
    />
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen pt-32 md:pt-0 pb-24 md:pb-0">
          <div className="mx-auto max-w-4xl px-3 sm:px-4 py-6">
            <AccountsSkeleton />
          </div>
        </div>
      }
    >
      <AllContent />
    </Suspense>
  );
}
